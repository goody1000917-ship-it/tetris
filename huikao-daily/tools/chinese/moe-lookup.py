# Looks words and characters up in 教育部《國語辭典簡編本》 (the dictionary 教育部 recommends for 中小學), falling back
# to 《重編國語辭典修訂本》, and prints each entry's 注音 and 釋義 as one JSON line per query.
# usage: python3 -I moe-lookup.py 揶揄 晾 行 [--revised] [--max 8]
# A single character with several readings (破音字) lists every entry. "found": false means neither dictionary has it;
# "found": null means the site could not be reached after retries (unknown, look it up again).
import html, json, re, subprocess, sys, tempfile, time, os, urllib.parse

SITES = {'簡編本': 'https://dict.concised.moe.edu.tw/', '修訂本': 'https://dict.revised.moe.edu.tw/'}
JAR = os.path.join(tempfile.gettempdir(), 'moe-lookup-cookies.txt')

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
    return {'word': word.group(1).strip() if word else '', 'zhuyin': (zy.group(1).strip() if zy else '').replace('　', ' '),
            'defs': re.sub(r'\s+', ' ', defs.group(1)).strip()[:1500] if defs else ''}

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
    words = [a for a in args if not a.startswith('--')]
    for w in words:
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
        print(json.dumps(res, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
