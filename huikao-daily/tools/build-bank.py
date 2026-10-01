import json, sys, glob, re, os
# Merge the five workflow results (task output files) into site/questions.json
outs = sys.argv[1:]
kept, dropped, per = [], [], {}
for f in outs:
    d = json.load(open(f))
    r = d.get('result') or {}
    kept += r.get('kept', []); dropped += r.get('dropped', [])
seen = set(); bank = []
for q in kept:
    if q['id'] in seen: continue
    seen.add(q['id'])
    if len(q['options']) != 4 or not (0 <= q['answer'] <= 3): continue
    bank.append(q)
bank.sort(key=lambda q: q['id'])
for q in bank: per[q['unit']] = per.get(q['unit'], 0) + 1
os.makedirs('site', exist_ok=True)
json.dump(bank, open('site/questions.json', 'w'), ensure_ascii=False, separators=(',', ':'))
m = sum(1 for q in bank if q['subject']=='math'); s = len(bank)-m
hard = sum(1 for q in bank if q['difficulty']=='難'); figs = sum(1 for q in bank if q.get('figure_svg'))
print(f"bank: {len(bank)} (math {m}, social {s}); hard {hard}; with figure {figs}; dropped {len(dropped)}")
print('per unit:', ' '.join(f"{k}:{v}" for k, v in sorted(per.items())))
why = {}
for x in dropped: k = x['why'].split(':')[0].split(' gen=')[0]; why[k] = why.get(k, 0) + 1
print('drop reasons:', why)

# ---- balance the position of the correct answer (A/B/C/D) ----
# Only questions whose explanation never refers to options by position can be rotated.
pos_ref = re.compile(r'選項[一二三四]|第[一二三四]個選項|\([A-D]\)|選項 ?[A-D]|[ABCD]\s*選項')
counts = [0, 0, 0, 0]
fixed, movable = [], []
for q in bank:
    (fixed if pos_ref.search(q['explanation']) else movable).append(q)
for q in fixed: counts[q['answer']] += 1
movable.sort(key=lambda q: q['id'])
for q in movable:
    target = counts.index(min(counts))
    shift = (target - q['answer']) % 4
    if shift:
        q['options'] = q['options'][-shift:] + q['options'][:-shift]
        q['answer'] = (q['answer'] + shift) % 4
    assert q['options'][q['answer']] == (q['options'][q['answer']])
    counts[q['answer']] += 1
json.dump(bank, open('site/questions.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(f"answer positions after balancing: {counts} (fixed {len(fixed)}, rotated pool {len(movable)})")
