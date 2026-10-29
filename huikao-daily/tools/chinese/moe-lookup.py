# Looks words and characters up in 教育部《國語辭典簡編本》 (the dictionary 教育部 recommends for 中小學), falling back
# to 《重編國語辭典修訂本》, and prints each entry's 注音 and 釋義 as one JSON line per query.
# usage: python3 -I moe-lookup.py 揶揄 晾 行 [--revised] [--max 8] [--no-cache]
# A single character with several readings (破音字) lists every entry, with its 部首 and stroke count when the page
# gives them. "found": false means neither dictionary has it; "found": null means the site could not be reached after
# retries (unknown, look it up again). Answers are kept in a shared cache file, so many checkers looking up the same
# words send each request to the (public) site once.
import atexit, html, json, re, subprocess, sys, tempfile, time, os, urllib.parse
try:
    import fcntl
except ImportError:   # Windows: no locking, one checker at a time
    fcntl = None

SITES = {'簡編本': 'https://dict.concised.moe.edu.tw/', '修訂本': 'https://dict.revised.moe.edu.tw/'}
# a fresh cookie jar for every run: an old session left in a shared jar made the 異體字字典 search return no
# results at all, so every character looked missing
_fd, JAR = tempfile.mkstemp(prefix='moe-cookies-'); os.close(_fd)
atexit.register(lambda: os.path.exists(JAR) and os.remove(JAR))
CACHE = os.environ.get('MOE_LOOKUP_CACHE') or os.path.join(tempfile.gettempdir(), 'moe-lookup-cache.jsonl')
CACHE_VERSION = 'v2'

def load_cache():
    out = {}
    try:
        with open(CACHE, encoding='utf-8') as f:
            for line in f:
                try:
                    r = json.loads(line)
                    out[r['key']] = r['res']
                except (ValueError, KeyError, TypeError):
                    pass   # a line cut short by a crash
    except FileNotFoundError:
        pass
    return out

def save_cache(key, res):
    with open(CACHE, 'a', encoding='utf-8') as f:
        if fcntl: fcntl.flock(f, fcntl.LOCK_EX)
        f.write(json.dumps({'key': key, 'res': res}, ensure_ascii=False) + '\n')
        f.flush()
        if fcntl: fcntl.flock(f, fcntl.LOCK_UN)

def fetch(url):
    # a dropped or failed request is retried, so it is never mistaken for "this dictionary has no such word"
    for attempt in range(4):
        r = subprocess.run(['curl', '-sS', '-L', '-m', '40', '-c', JAR, '-b', JAR, '-w', '\n%{http_code} %{url_effective}', url], capture_output=True)
        body = r.stdout.decode('utf-8', 'replace')
        i = body.rfind('\n')
        code, _, final = body[i + 1:].partition(' ')
        if r.returncode == 0 and code == '200' and len(body) > 500:
            return body[:i], final
        time.sleep(1 + 2 * attempt)
    raise RuntimeError(f'dictionary request failed after retries: {url}')

def entry(page):
    m = re.search(r'<meta name="Description" content="([^"]*)"', page)
    if not m:
        return None
    d = html.unescape(m.group(1))
    word = re.search(r'字詞:([^,]*)', d)
    zy = re.search(r'注音:([^,]*)', d)
    defs = re.search(r'釋義:(.*)$', d, re.S)
    e = {'word': word.group(1).strip() if word else '', 'zhuyin': (zy.group(1).strip() if zy else '').replace('　', ' '),
         'defs': re.sub(r'\s+', ' ', defs.group(1)).strip()[:1500] if defs else ''}
    # single characters carry e.g. ",刀部+6畫 共8畫," (部首, strokes outside it, total strokes)
    rad = re.search(r',\s*(\S)部\s*\+?\s*(\d+)畫\s*共\s*(\d+)畫', d)
    if rad:
        e.update({'radical': rad.group(1), 'strokes': int(rad.group(3))})
    return e

def lookup(word, site, limit):
    base = SITES[site]
    page, final = fetch(base + 'search.jsp?' + urllib.parse.urlencode({'md': '1', 'word': word}))
    if 'dictView.jsp' in final:
        e = entry(page)
        return [e] if e else []
    # a result list: follow each entry whose headword is exactly the query
    ids = []
    for m in re.finditer(r'<a href="/?dictView\.jsp\?ID=(\d+)[^"]*"\s*>(.*?)</a>', page, re.S):
        head = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        head = re.sub(r'[\s\d]+$', '', head)
        if head == word and m.group(1) not in ids:
            ids.append(m.group(1))
    out = []
    for i in ids[:limit]:
        e = entry(fetch(base + 'dictView.jsp?ID=' + i)[0])
        if e:
            out.append(e)
    return out

def main():
    args = [a for a in sys.argv[1:]]
    limit = 8
    if '--max' in args:
        k = args.index('--max'); limit = int(args[k + 1]); del args[k:k + 2]
    sites = ['修訂本'] if '--revised' in args else ['簡編本', '修訂本']
    use_cache = '--no-cache' not in args
    words = [a for a in args if not a.startswith('--')]
    cache = load_cache() if use_cache else {}
    for w in words:
        key = '|'.join([CACHE_VERSION] + sites + [str(limit), w])
        if key in cache:
            print(json.dumps(cache[key], ensure_ascii=False), flush=True)
            continue
        res = {'query': w, 'found': False}
        for site in sites:
            try:
                es = lookup(w, site, limit)
            except RuntimeError as e:
                res = {'query': w, 'found': None, 'error': str(e)}   # unknown, not "missing": check again later
                break
            if es:
                res = {'query': w, 'found': True, 'dict': site, 'entries': es}
                break
        if use_cache and res['found'] is not None:
            save_cache(key, res)
            cache[key] = res
        print(json.dumps(res, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
