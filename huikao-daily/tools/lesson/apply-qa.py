# Applies the QA workflow's revised units to lesson-data.json and bank-families.json (backups kept as *.preqa.json).
# usage: python3 apply-qa.py <qa task output>
import json, sys, shutil, os
qa = json.load(open(sys.argv[1]))['result']
for f in ('lesson-data.json', 'bank-families.json'):
    if not os.path.exists(f.replace('.json', '.preqa.json')): shutil.copy(f, f.replace('.json', '.preqa.json'))
data = json.load(open('lesson-data.json')); bank = json.load(open('bank-families.json'))
for fx in qa['fixes']:
    if fx.get('error') or fx.get('kept') or not fx.get('unit'):
        print('NOT APPLIED', fx.get('label'), fx.get('error') or 'kept current'); continue
    u, rep = fx['unit'], fx.get('report', {})
    if fx['kind'] == 'lesson':
        data['sections'][fx['index']]['blocks'] = u['blocks']
    elif fx['kind'] == 'exam':
        by = {p['type']: p for p in u['problems']}
        for i, p in enumerate(data['exam']):
            if p['type'] in by:
                q = by[p['type']]; q['title'] = q.get('title') or p.get('title'); data['exam'][i] = q
    elif fx['kind'] == 'bank':
        by = {f['key']: f for f in u['families']}
        bank['families'] = [by.get(f['key'], f) for f in bank['families']]
    print('applied', fx['label'], '| dropped', rep.get('droppedVariants'), rep.get('droppedItems'), '| example mismatch', [m['id'] for m in rep.get('exampleMismatch', [])], '| left', rep.get('remainingProblems'))
    for d in rep.get('recheckDisagreements', []): print('   recheck:', d['id'], d['why'][:200])
json.dump(data, open('lesson-data.json', 'w'), ensure_ascii=False, indent=1)
json.dump(bank, open('bank-families.json', 'w'), ensure_ascii=False, indent=1)
