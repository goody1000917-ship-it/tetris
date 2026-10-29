# Checks every 注音 a question's explanation teaches (「詞：注音」 lines and 「…的詞讀注音」 statements), not only the
# tested characters: 會考 avoids readings the 88 and 101 《國語一字多音審訂表》 disagree on, so an explanation should not
# teach one as fact either (e.g. 簇擁 ㄩㄥˇ: the 88 table reads 擁 ㄩㄥ only). Options are not checked, since wrong
# options carry wrong readings on purpose; the tested characters are checked by check-shending.py.
# usage: python3 -I check-expl-readings.py <v88.json> <v101.json> <web-shending.json> <bank.json>
# prints one line per doubtful reading: id, word, character, reading, why. Exit status 1 when there is any.
import json, re, sys

v88, v101, shen = (json.load(open(p, encoding='utf-8')) for p in sys.argv[1:4])
bank = json.load(open(sys.argv[4], encoding='utf-8'))
ZY1 = r'˙?[ㄅ-ㄩ]+[ˊˇˋ]?'
ZY = re.compile(ZY1)
SEQ = rf'{ZY1}(?:[ 　]{ZY1})*'
# 「詞：注音」 (the word may mark its tested character with 「」) and 「…的詞讀注音」, but not 「…不讀注音」 (a wrong reading)
KV = re.compile(rf'([一-鿿「」]{{1,16}})[：:]\s*({SEQ})')
READ = re.compile(rf'([一-鿿「」]{{1,16}})(?<!不)讀\s*({SEQ})')
CUT = re.compile(r'.*[的在和與或是當時跟及]')   # 「只有逾和渝都讀ㄩˊ」 → 渝都 → 渝
TAIL = '都也才就還又只亦皆均則要'
# words whose reading changed between the versions (e.g. 擁抱 ㄩㄥ → ㄩㄥˇ); a version difference in another word of
# the same character (胡同) says nothing about this one (不同)
changed = {}
for a in shen.get('avoid', []):
    for v in (a.get('v88'), a.get('v101'), a.get('v109')):
        changed.setdefault((a['char'], a.get('word')), set()).update(ZY.findall(str(v or '')))

def readings(table, ch):
    out = set(table.get('single', {}).get(ch, []))
    for e in table.get('multi', {}).get(ch, []):
        out |= {r.get('zy') for r in e.get('readings', []) if r.get('zy')}
    return out

def pinned(table, ch, word):
    for e in table.get('multi', {}).get(ch, []):
        if word and word in str(e.get('ex', '')):
            zys = [r.get('zy') for r in e.get('readings', []) if r.get('zy')]
            if len(zys) == 1: return zys[0]
    return None

problems = []
for q in bank:
    seen = set()
    for line in str(q.get('explanation', '')).split('\n'):
        for pat in (KV, READ):
            for m in pat.finditer(line):
                raw, syl = m.group(1), m.group(2).split()
                if pat is READ:
                    raw = CUT.sub('', raw).rstrip(TAIL)   # 「…，都讀ㄩˊ」 leaves nothing: skip it
                word = raw.replace('「', '').replace('」', '')
                focus = re.findall(r'「(.)」', raw)
                if word and len(syl) == len(word): pairs = list(zip(word, syl))
                elif len(syl) == 1 and len(focus) == 1: pairs = [(focus[0], syl[0])]
                else: continue   # cannot tell which character each syllable belongs to
                for ch, zy in pairs:
                    if (ch, zy, word) in seen or zy.startswith('˙'): continue   # 88 lists no 輕聲 at all
                    seen.add((ch, zy, word))
                    r88, r101 = readings(v88, ch), readings(v101, ch)
                    if not r88 and not r101: continue   # not a character the tables regulate
                    p88, p101 = pinned(v88, ch, word), pinned(v101, ch, word)
                    why = None
                    if p88 and p101 and p88 != p101: why = f'the tables read {word} {p88} (88) and {p101} (101)'
                    elif zy not in r88 | r101: why = f'not a listed reading of {ch} (88 {sorted(r88)}, 101 {sorted(r101) or "not covered"})'
                    elif (ch, word) in changed: why = f'{word} is read differently in the 審訂表 versions ({sorted(changed[(ch, word)])})'
                    elif zy in (r88 ^ r101 if r101 else set()) and not (p88 == p101 == zy):
                        why = f'a reading of {ch} only one table lists (88 {sorted(r88)}, 101 {sorted(r101)})'
                    if why: problems.append(f'{q["id"]}: {word} 「{ch}」 {zy}: {why}')
print('\n'.join(problems) if problems else 'every reading the explanations teach agrees with the 88 and 101 tables')
sys.exit(1 if problems else 0)
