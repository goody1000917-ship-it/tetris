# Builds the 生殖 mistake lesson from the workflow outputs.
# usage: python3 assemble-repro.py <out dir> <lesson outputs...> --exam <exam output> [--patch patch.json] [--figs dir]
# writes repro.html (artifact page), repro.site.html (with doctype + metas for daily.happygoody.net) and repro-data.json
import json, sys, os, base64
here = os.path.dirname(os.path.abspath(__file__))
TITLES = {'g1': '染色體怎麼算：「對」和「條」', 'g2': '有性還是無性：要「一模一樣」還是「新組合」',
          'g3': '開花植物：授粉、花粉管、受精、種子', 'g4': '動物：在哪裡受精、在哪裡長大'}
args = sys.argv[1:]
def opt(name):
    return args[args.index(name) + 1] if name in args else None
out_dir, exam_file, patch_file, figs_dir = args[0], opt('--exam'), opt('--patch'), opt('--figs')
lesson_files = [a for i, a in enumerate(args) if i > 0 and not a.startswith('--') and args[i - 1] not in ('--exam', '--patch', '--figs')]
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
figs = {}
if figs_dir:
    for name in ('egg', 'pistil'):
        p = os.path.join(figs_dir, name + '.jpg')
        if os.path.exists(p): figs[name] = 'data:image/jpeg;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
data = {'sections': [secs[k] for k in sorted(secs)], 'exam': exam, 'figs': figs}
if patch_file:  # reviewed fixes: [{"old": "exact text", "new": "replacement", "why": "..."}] (each must match exactly once) or inserts (below)
    def strings(node, path=()):
        if isinstance(node, dict):
            for k, v in node.items(): yield from strings(v, path + (k,))
        elif isinstance(node, list):
            for i, v in enumerate(node): yield from strings(v, path + (i,))
        elif isinstance(node, str): yield path, node
    for e in json.load(open(patch_file)):
        if 'insert' in e:  # {"insert": {"sec": "g2", "before": <index>}, "block": {...}}; the block at that index must have type e["expect"]
            blocks = next(x for x in data['sections'] if x['id'] == e['insert']['sec'])['blocks']
            i = e['insert']['before']
            if blocks[i]['type'] != e['expect']: sys.exit(f"INSERT target is {blocks[i]['type']}, expected {e['expect']}")
            blocks.insert(i, e['block']); continue
        hits = [(p, v) for p, v in strings({k: v for k, v in data.items() if k != 'figs'}) if e['old'] in v]
        n = sum(v.count(e['old']) for p, v in hits)
        if n != 1: sys.exit(f"PATCH matched {n} times: {e['old'][:40]}")
        p = hits[0][0]; node = data
        for k in p[:-1]: node = node[k]
        node[p[-1]] = node[p[-1]].replace(e['old'], e['new'])
missing = [k for k in TITLES if k not in secs]
if missing: print('MISSING SECTIONS', missing)
src = open(os.path.join(here, 'repro.src.html')).read()
blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
page = src.replace('__LESSON_DATA__', blob)
open(os.path.join(out_dir, 'repro.html'), 'w').write(page)
open(os.path.join(out_dir, 'repro.site.html'), 'w').write('<!doctype html>\n<html lang="zh-Hant">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + page)
json.dump({k: v for k, v in data.items() if k != 'figs'}, open(os.path.join(out_dir, 'repro-data.json'), 'w'), ensure_ascii=False, indent=1)
cnt = lambda t: sum(1 for s in data['sections'] for b in s['blocks'] if b['type'] == t)
print(f"sections {len(data['sections'])}, mistakes {cnt('mistake')}, examples {cnt('example')}, checks {cnt('check')}, demos {cnt('demo')}, exam problems {len(exam)} ({sum(len(p['variants']) for p in exam)} variants); page {len(page)//1024} KB")
