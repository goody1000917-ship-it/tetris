# Builds tools/chinese-questions.json (live 會考每日練 format, subject "chinese") from the checked question batches and
# the past 會考 questions, and refuses anything the live page would show wrongly.
# usage: python3 -I build-bank.py <qgen dir> <exam dir> <out.json>
#   <qgen dir>/<batch>.fixed.json  {"unit","questions":[{stem,options,answer,difficulty,topic,explanation,targets}]}
#   <qgen dir>/<batch>.drops.json  {"drop":[question indexes to leave out],"why":{...}}   (from the recheck)
#   <exam dir>/<batch>.final.json  {"questions":[{year,qno,unit,stem,options,answer,difficulty,topic,explanation,keep,reason}]}
import glob, json, os, re, sys

UNITS = {
    'W01': ('字音', '一字多音（破音字）'),
    'W02': ('字音', '容易讀錯的字'),
    'W03': ('字形', '同音字、形近字辨正'),
    'W04': ('字義', '一字多義'),
    'W05': ('字形', '造字原則與部首'),
}
# the live page turns 2+ spaces, tabs, full-width spaces and ｜ into table cells, and keeps the bank's option order
# only when the explanation names options by position; these questions are shuffled, so neither may appear
TABLE_RE = re.compile(r' {2,}|\t|　|[|｜]')
POS_RE = re.compile(r'選項[一二三四]|第[一二三四]個選項|[①②③④]|[(（][A-DＡ-Ｄ][)）]|[A-D]選項')
EXAM_LABEL = {'105R': ('R105', '105年會考（新店考場重考）'), '111S': ('S111', '111年會考參考題本')}

qgen_dir, exam_dir, out = sys.argv[1:4]
problems, bank = [], []

def check(q, where):
    errs = []
    if not isinstance(q.get('stem'), str) or not q['stem'].strip(): errs.append('empty stem')
    opts = q.get('options')
    if not isinstance(opts, list) or len(opts) != 4 or any(not isinstance(o, str) or not o.strip() for o in opts): errs.append('options must be 4 non-empty strings')
    elif len(set(o.strip() for o in opts)) != 4: errs.append('options repeat')
    if q.get('answer') not in (0, 1, 2, 3): errs.append('answer must be 0-3')
    if not isinstance(q.get('explanation'), str) or len(q['explanation'].strip()) < 20: errs.append('explanation missing or too short')
    if q.get('difficulty') not in ('中', '難'): errs.append('difficulty must be 中 or 難')
    for field in ('stem', 'explanation'):
        for line in str(q.get(field, '')).split('\n'):
            if TABLE_RE.search(line): errs.append(f'{field} has a space/｜ the page would turn into a table: {line[:40]}')
    for o in opts or []:
        if isinstance(o, str) and TABLE_RE.search(o): errs.append(f'option has a space/｜: {o[:40]}')
    if POS_RE.search(str(q.get('explanation', ''))) or POS_RE.search(str(q.get('stem', ''))): errs.append('names an option by position (the page shuffles options)')
    for e in errs: problems.append(f'{where}: {e}')
    return not errs

def entry(q, unit, qid, source=None):
    area, unit_name = UNITS[unit]
    e = {'id': qid, 'subject': 'chinese', 'area': area, 'unit': unit, 'unit_name': unit_name, 'topic': str(q.get('topic') or '').strip()[:20] or unit_name,
         'difficulty': q['difficulty'], 'stem': q['stem'].strip(), 'options': [o.strip() for o in q['options']], 'answer': q['answer'],
         'explanation': q['explanation'].strip()}
    if source: e['source'] = source
    return e

# practice questions, numbered per unit in batch order
counter = {u: 0 for u in UNITS}
for path in sorted(glob.glob(os.path.join(qgen_dir, '*.fixed.json'))):
    batch = os.path.basename(path)[:-len('.fixed.json')]
    data = json.load(open(path, encoding='utf-8'))
    unit = data['unit']
    drops_path = os.path.join(qgen_dir, batch + '.drops.json')
    drop = set(json.load(open(drops_path, encoding='utf-8')).get('drop', [])) if os.path.exists(drops_path) else None
    if drop is None: problems.append(f'{batch}: no .drops.json (the recheck result is missing)'); continue
    for i, q in enumerate(data['questions']):
        if i in drop: continue
        if not check(q, f'{batch}#{i}'): continue
        counter[unit] += 1
        bank.append(entry(q, unit, f'{unit}-{counter[unit]:02d}'))

# past 會考 questions; the 111 sample paper reprinted some earlier questions word for word, so a question whose stem
# and options match one already taken is skipped (main exams sort before the sample paper and the re-sit)
seen_ids, seen_text = set(), set()
norm = lambda t: re.sub(r'\s+', '', str(t))
order = lambda q: (str(q['year']) in EXAM_LABEL, str(q['year']), int(q['qno']))
exam_qs = []
for path in sorted(glob.glob(os.path.join(exam_dir, '*.final.json'))):
    exam_qs += json.load(open(path, encoding='utf-8'))['questions']
for q in sorted(exam_qs, key=order):
    if not q.get('keep'): continue
    key = (norm(q.get('stem')), tuple(norm(o) for o in q.get('options') or []))
    if key in seen_text: print(f'skipped {q["year"]}-{q["qno"]}: same question as an earlier paper'); continue
    year, qno = str(q['year']), int(q['qno'])
    prefix, label = EXAM_LABEL.get(year, ('Y' + year, year + '年會考'))
    qid = f'{prefix}-{qno:02d}'
    if qid in seen_ids: problems.append(f'{qid}: duplicate'); continue
    if q.get('unit') not in UNITS: problems.append(f'{qid}: unknown unit {q.get("unit")}'); continue
    if not check(q, qid): continue
    seen_ids.add(qid); seen_text.add(key)
    bank.append(entry(q, q['unit'], qid, f'{label} 第{qno}題'))

ids = [q['id'] for q in bank]
assert len(ids) == len(set(ids)), 'duplicate ids'
assert all(re.fullmatch(r'[A-Z]\d{2,3}-\d{2}', i) for i in ids), 'an id the sync Worker would refuse'
json.dump(bank, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
by = {}
for q in bank: by[q['unit']] = by.get(q['unit'], 0) + 1
print(f'{len(bank)} questions ({sum(1 for q in bank if "source" in q)} 會考原題): ' + ', '.join(f'{u} {n}' for u, n in sorted(by.items())))
if problems:
    print(f'{len(problems)} problems (these questions were left out):')
    for p in problems: print('  ' + p)
    sys.exit(1)
