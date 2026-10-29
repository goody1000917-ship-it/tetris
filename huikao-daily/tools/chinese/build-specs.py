# Splits the ranked (and, when present, dictionary-verified) research items into question-writing batches.
# usage: python3 -I build-specs.py <research dir> <out specs dir> W01=30 W02=35 W03=40 W04=30 [W05=6] [--size 10]
# Each batch gets `size` main items (one question each, strongest exam evidence first), the rest of its unit as a pool
# for wrong options, a few real 會考 questions of the same unit as style examples, and the characters to avoid.
import glob, json, os, sys

UNITS = {'W01': ('字音', '一字多音（破音字）', ['讀音相同／不同（兩詞一組）', '讀音正確（句子＋注音）']),
         'W02': ('字音', '容易讀錯的字', ['讀音正確（句子＋注音）', '讀音相同／不同（兩詞一組）']),
         'W03': ('字形', '同音字、形近字辨正', ['沒有錯別字（四個句子）', '「」中的字使用正確', '注音寫成國字後兩兩相同']),
         'W04': ('字義', '一字多義', ['意義相同／不同（兩詞或兩句一組）', '「」中的字解釋正確']),
         'W05': ('字形', '造字原則與部首', ['造字原則（六書）', '部首'])}
args = sys.argv[1:]
size = 10
if '--size' in args:
    k = args.index('--size'); size = int(args[k + 1]); del args[k:k + 2]
rdir, odir = args[0], args[1]
want = dict(a.split('=') for a in args[2:])
os.makedirs(odir, exist_ok=True)

ranked = json.load(open(os.path.join(rdir, 'ranked.json'), encoding='utf-8'))
status = {}
for f in glob.glob(os.path.join(rdir, 'verified-*.json')):
    for it in json.load(open(f, encoding='utf-8')).get('items', []):
        status[it.get('n')] = it
items = []
for it in ranked['items']:
    # with verified-*.json files, only items they kept; without them, every ranked item (the writers verify each one)
    v = status.get(it['n']) if status else {}
    if v is None or v.get('status') == 'drop': continue
    merged = dict(it); merged.update({k: v[k] for k in v if k not in ('n',)})
    if merged.get('avoid'): continue   # a 字音 reading the 審訂表 versions disagree on, or a disputed 六書 case
    items.append(merged)
avoid = ranked.get('avoid_chars', [])
exams = []
for f in sorted(glob.glob(os.path.join(rdir, 'papers-*.json'))):
    exams += json.load(open(f, encoding='utf-8')).get('questions', [])
cat_unit = {'字音': ['W01', 'W02'], '字形': ['W03'], '字義': ['W04'], '造字': ['W05']}

report = []
for unit, n in sorted(want.items()):
    n = int(n)
    area, name, types = UNITS[unit]
    pool = sorted([it for it in items if it.get('unit') == unit], key=lambda it: (it.get('priority', 3), it['n']))
    if len(pool) < n: report.append(f'{unit}: only {len(pool)} verified items for {n} questions; using {len(pool)}'); n = len(pool)
    # the newest real questions show today's wording (字音 has asked 讀音正確 since 108)
    examples = sorted([q for q in exams if unit in cat_unit.get(q.get('category'), [])], key=lambda q: -int(str(q.get('year'))[:3]))[:4]
    batches = [pool[i:i + size] for i in range(0, n, size)]
    for b, main in enumerate(batches, 1):
        main_ids = {it['n'] for it in main}
        spec = {'batch': f'{unit}-b{b}', 'unit': unit, 'unit_name': name, 'area': area, 'count': len(main), 'types': types,
                'main_items': main, 'pool': [it for it in pool if it['n'] not in main_ids][:80],
                'exam_examples': examples, 'avoid_chars': avoid}
        json.dump(spec, open(os.path.join(odir, f'{unit}-b{b}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        report.append(f'{unit}-b{b}: {len(main)} questions, pool {len(spec["pool"])}')
print('\n'.join(report))
