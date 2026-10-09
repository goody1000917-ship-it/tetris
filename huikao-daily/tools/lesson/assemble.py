# Builds the lesson page from the workflow outputs.
# usage: python3 assemble.py <lesson outputs...> --exam <exam output> [--patch patch.json]
# writes similar.html (artifact page) and similar.site.html (same page with doctype + metas for daily.happygoody.net)
import json, sys, os
here = os.path.dirname(os.path.abspath(__file__))
TITLES = {
 's0': '暖身：比例式三招', 's1': 'A 字型：平行線截出成比例的線段', 's2': 'X 字型與三條平行線',
 's3': '反過來用：比例相等就平行；中點連線', 's4': '相似形：形狀一樣、大小可以不同', 's5': '三角形相似的判定：AA、SAS、SSS',
 's6': '相似比帶出的周長比、高比、面積比', 's7': '直角三角形：母子相似與特殊直角三角形', 's8': '生活應用：影子、鏡子與測量'}
EXAM_TITLES = {'e01': 'A 字型含代數', 'e02': 'A 字型與面積', 'e03': '平行四邊形中的 X 字型', 'e04': '梯形內的平行線段', 'e05': '三條平行線',
 'e06': '中點連線', 'e07': '用比例判斷平行', 'e08': '斜 A 字型', 'e09': '相似的判定', 'e10': '由面積比反推', 'e11': '梯形對角線面積',
 'e12': '母子相似', 'e13': '內接正方形', 'e14': '影子與測量', 'e15': '摺紙', 'e16': '方格紙上的相似'}
args = sys.argv[1:]
exam_file = args[args.index('--exam') + 1] if '--exam' in args else None
patch_file = args[args.index('--patch') + 1] if '--patch' in args else None
lesson_files = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] not in ('--exam', '--patch', '--data'))]
secs = {}
for f in lesson_files:
    for r in json.load(open(f))['result']['results']:
        if r.get('error'): print('UNIT ERROR', r['id'], r['error']); continue
        secs[r['id']] = {'id': r['id'], 'title': TITLES[r['id']], 'blocks': r['blocks']}
exam = []
for r in (json.load(open(exam_file))['result']['results'] if exam_file else []):
    if r.get('error'): print('UNIT ERROR', r['id'], r['error']); continue
    exam += r['problems']
exam.sort(key=lambda p: p['type'])
for p in exam:
    p['title'] = (p.get('title') or '').strip() or EXAM_TITLES.get(p['type'], '')
data = {'sections': [secs[k] for k in sorted(secs)], 'exam': exam}
if '--data' in args:  # start from an already merged lesson-data.json instead
    data = json.load(open(args[args.index('--data') + 1])); secs = {s['id']: s for s in data['sections']}; exam = data['exam']
if patch_file:  # hand edits: [{"path": ["sections", 1, "blocks", 3, "text"], "value": "..."}]
    for e in json.load(open(patch_file)):
        node = data
        for k in e['path'][:-1]: node = node[k]
        node[e['path'][-1]] = e['value']
missing = [k for k in TITLES if k not in secs]
if missing: print('MISSING SECTIONS', missing)
src = open(os.path.join(here, 'similar.src.html')).read()
blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
page = src.replace('__LESSON_DATA__', blob)
open(os.path.join(here, 'similar.html'), 'w').write(page)
open(os.path.join(here, 'similar.site.html'), 'w').write('<!doctype html>\n<html lang="zh-Hant">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + page)
if '--data' not in args: json.dump(data, open(os.path.join(here, 'lesson-data.json'), 'w'), ensure_ascii=False, indent=1)
nchk = sum(1 for s in data['sections'] for b in s['blocks'] if b['type'] == 'check')
nvar = sum(len(b['variants']) for s in data['sections'] for b in s['blocks'] if b['type'] == 'check')
nex = sum(1 for s in data['sections'] for b in s['blocks'] if b['type'] == 'example')
print(f"sections {len(data['sections'])}, examples {nex}, checks {nchk} ({nvar} variants), exam problems {len(exam)} ({sum(len(p['variants']) for p in exam)} variants); page {len(page)//1024} KB")
