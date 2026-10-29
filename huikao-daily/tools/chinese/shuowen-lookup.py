# Looks single characters up in 教育部《異體字字典》 and prints each 正字's 說文釋形 (the 說文解字 text, the basis for
# 造字原則 / 六書 answers), 部首, stroke count and readings, as one JSON line per character.
# usage: python3 -I shuowen-lookup.py 休 江 本
# "found": false means the dictionary has no 正字 for it; "found": null means the site could not be reached after
# retries (unknown, look it up again). 說文 does not name the 六書 category outright: 「象形」「指事」 are often stated,
# 「从A从B」「从A、B」 or 「从A依B」 reads as 會意, and 「从A，B聲」 as 形聲.
import html, json, os, re, subprocess, sys, tempfile, time, urllib.parse

BASE = 'https://dict.variants.moe.edu.tw/'
JAR = os.path.join(tempfile.gettempdir(), 'shuowen-lookup-cookies.txt')

def fetch(url, ref=None):
    for attempt in range(4):
        cmd = ['curl', '-sS', '-L', '-m', '40', '-c', JAR, '-b', JAR, '-w', '\n%{http_code}']
        if ref: cmd += ['-e', ref]
        r = subprocess.run(cmd + [url], capture_output=True)
        body = r.stdout.decode('utf-8', 'replace')
        i = body.rfind('\n')
        if r.returncode == 0 and body[i + 1:] == '200' and i > 500:
            return body[:i]
        time.sleep(1 + 2 * attempt)
    raise RuntimeError(f'dictionary request failed after retries: {url}')

def flat(page):
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', page, flags=re.S)
    t = re.sub(r'<img[^>]*>', ' ', t)   # 小篆 glyph pictures
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t)))

def lookup(ch):
    surl = BASE + 'search.jsp?' + urllib.parse.urlencode({'QTP': '0', 'WORD': ch})
    page = fetch(surl)
    # the 正字 whose code point is the query (a search also lists characters that merely contain it)
    view = None
    for m in re.finditer(r'href="(dictView\.jsp\?ID=\d+[^"]*)"[^>]*data-tp=\'正\'[^>]*data-ucs=\'U\+([0-9A-F]+)\'', page):
        if chr(int(m.group(2), 16)) == ch:
            view = BASE + html.unescape(m.group(1)); break
    if not view:
        return {'query': ch, 'found': False}
    t = flat(fetch(view, ref=surl))
    head = re.search(r'正 字 ([A-Z]\d+) (\S) (\S+?)-(\d+)-(\d+) ', t)
    sw = re.search(r'說文釋形 (.*?) (?:字樣說明|注 音)', t)
    note = re.search(r'字樣說明 (.*?) 注 音', t)
    zy = re.search(r'注 音 (.*?) 漢語拼音', t)
    return {'query': ch, 'found': True, 'id': head.group(1) if head else '', 'radical': head.group(3) if head else '',
            'strokes': int(head.group(5)) if head else None, 'shuowen': sw.group(1).strip() if sw else '',
            'note': note.group(1).strip()[:300] if note else '', 'zhuyin': re.sub(r' (?=[ˊˇˋ˙])', '', zy.group(1)).strip() if zy else '',
            'url': view}

for ch in [a for a in sys.argv[1:] if not a.startswith('--')]:
    try:
        res = lookup(ch)
    except RuntimeError as e:
        res = {'query': ch, 'found': None, 'error': str(e)}
    print(json.dumps(res, ensure_ascii=False), flush=True)
    time.sleep(1)
