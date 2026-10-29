# Checks the 字音 targets of question batches against the official 《國語一字多音審訂表》: 會考 bases readings on the
# 88年版 and avoids anything the 101年 審訂初稿 reads differently, so every tested reading must be listed for its
# character (in the 101 draft too when it covers the character), agree where an example word pins it down, and not be
# a reading that took part in a recorded change unless both tables pin this very word to it.
# usage: python3 -I check-shending.py <v88.json> <v101.json> <web-shending.json> <batch.json>...
#   batch.json: {"unit": "W01", "questions": [{"targets": [{"word", "focus", "truth"}...]}...]} (only W01/W02 are checked)
# prints one line per problem (file#question: …) and exits 1 when there is any.
import json, re, sys

v88, v101, shen = (json.load(open(p, encoding='utf-8')) for p in sys.argv[1:4])
avoid_words = {a.get('word') for a in shen.get('avoid', []) if a.get('word')}
# per character, every reading that took part in a recorded change (88 → 101 → 109), e.g. 長: ㄓㄤˋ (身無長物)
ZY = re.compile(r'˙?[\u3105-\u3129]+[ˊˇˋ]?')
changed = {}
for a in shen.get('avoid', []):
    for v in (a.get('v88'), a.get('v101'), a.get('v109')):
        changed.setdefault(a['char'], set()).update(ZY.findall(str(v or '')))

def syllables(zy):
    return [s for s in re.split(r'[\s　]+', str(zy).strip()) if s]

def readings(table, ch):
    out = set(table.get('single', {}).get(ch, []))
    for e in table.get('multi', {}).get(ch, []):
        out |= {r.get('zy') for r in e.get('readings', []) if r.get('zy')}
    return out

def pinned(table, ch, word):
    # the reading an entry gives for this character when its example words include the word
    for e in table.get('multi', {}).get(ch, []):
        if word and word in str(e.get('ex', '')):
            zys = [r.get('zy') for r in e.get('readings', []) if r.get('zy')]
            if len(zys) == 1: return zys[0]
    return None

problems = []
for path in sys.argv[4:]:
    data = json.load(open(path, encoding='utf-8'))
    if data.get('unit') not in ('W01', 'W02'): continue
    for i, q in enumerate(data.get('questions', [])):
        for t in q.get('targets', []):
            word, focus, truth = str(t.get('word', '')), str(t.get('focus', '')), t.get('truth', '')
            if len(focus) != 1:
                problems.append(f'{path}#{i}: target focus must be one character: {t}'); continue
            syl = syllables(truth)
            if len(syl) > 1 and len(syl) == len(word) and focus in word: syl = [syl[word.index(focus)]]
            if len(syl) != 1:
                problems.append(f'{path}#{i}: cannot tell the reading of 「{focus}」 in {word} from truth {truth!r}'); continue
            zy = syl[0]
            where = f'{path}#{i} 「{focus}」({word} {zy})'
            if word in avoid_words:
                problems.append(f'{where}: this word is on the 審訂 avoid list (versions differ)'); continue
            r88, r101 = readings(v88, focus), readings(v101, focus)
            # 88 is the base and lists ~10,000 characters; the 101 draft covers ~5,000 and is checked where it has the character
            if zy not in r88 or (r101 and zy not in r101):
                problems.append(f'{where}: reading not listed (88 {sorted(r88)}, 101 {sorted(r101) if r101 else "not covered"})'); continue
            p88, p101 = pinned(v88, focus, word), pinned(v101, focus, word)
            if p88 and p101 and p88 != p101:
                problems.append(f'{where}: the word is read {p88} in 88 but {p101} in 101'); continue
            if (p88 and p88 != zy) or (p101 and p101 != zy):
                problems.append(f'{where}: the official tables read this word {p88 or p101}'); continue
            # a reading that took part in a change is fine only where both tables pin this very word to it
            if zy in changed.get(focus, set()) | (r88 ^ r101 if r101 else set()) and not (p88 == p101 == zy):
                problems.append(f'{where}: this reading of 「{focus}」 changed between versions and the tables do not pin this word to it')
print('\n'.join(problems) if problems else 'all 字音 targets agree with the 88 and 101 tables')
sys.exit(1 if problems else 0)
