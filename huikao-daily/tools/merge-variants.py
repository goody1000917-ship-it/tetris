import json, sys, re, os
# Append verified sibling questions (variant_of = original id) to questions.json.
# usage: python3 tools/merge-variants.py <workflow task output files...>   (run from anywhere; edits ../questions.json)
BANK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'questions.json')
bank = json.load(open(BANK))
originals = [q for q in bank if not q.get('variant_of')]
ids = {q['id'] for q in originals}
kept = []
for f in sys.argv[1:]:
    r = json.load(open(f)).get('result') or {}
    kept += r.get('kept', [])
seen = set(); variants = []
for v in kept:
    if v['variant_of'] not in ids or v['id'] in seen: continue
    if len(v['options']) != 4 or not (0 <= v['answer'] <= 3): continue
    seen.add(v['id']); variants.append(v)
# balance the correct letter among siblings too (explanations citing positions keep their order)
pos_ref = re.compile(r'選項[一二三四]|第[一二三四]個選項|\([A-D]\)|選項 ?[A-D]|[ABCD]\s*選項')
counts = [0, 0, 0, 0]
for q in originals: counts[q['answer']] += 1
variants.sort(key=lambda q: q['id'])
for q in variants:
    if pos_ref.search(q['explanation']): counts[q['answer']] += 1; continue
    target = counts.index(min(counts)); shift = (target - q['answer']) % 4
    if shift: q['options'] = q['options'][-shift:] + q['options'][:-shift]; q['answer'] = (q['answer'] + shift) % 4
    counts[q['answer']] += 1
json.dump(originals + variants, open(BANK, 'w'), ensure_ascii=False, separators=(',', ':'))
per = {}
for v in variants: per[v['variant_of']] = per.get(v['variant_of'], 0) + 1
n2 = sum(1 for k in per.values() if k >= 2); n1 = sum(1 for k in per.values() if k == 1)
print(f"originals {len(originals)}, siblings {len(variants)}; originals with 2 siblings {n2}, with 1 {n1}, with 0 {len(originals) - len(per)}; answer positions {counts}")
