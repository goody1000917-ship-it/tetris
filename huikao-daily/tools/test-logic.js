const fs = require('fs');
const html = fs.readFileSync(process.env.SITE_HTML || __dirname + '/../index.html', 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
new Function(script);                                  // whole inline script must parse
const logic = script.slice(script.indexOf('/*@logic-start*/'), script.indexOf('/*@logic-end*/'));
const vm = require('vm'); const ctx = {}; vm.createContext(ctx); vm.runInContext(logic, ctx);
const L = ctx; const assert = require('assert');

// ---- ladder: 1, 3, 7, 14 days, learned on the 5th correct day, then a 30-day check, then every 60 days ----
let c = L.newCard(); const t = '2026-10-01';
c = L.applyAnswer(c, true, t); assert.equal(c.box, 1); assert.equal(c.due, '2026-10-02');
c = L.applyAnswer(c, true, '2026-10-02'); assert.equal(c.box, 2); assert.equal(c.due, '2026-10-05');
c = L.applyAnswer(c, false, '2026-10-05'); assert.equal(c.box, 0); assert.equal(c.due, '2026-10-06'); assert.equal(c.mastered, false);
c = L.applyAnswer(c, true, '2026-10-06'); c = L.applyAnswer(c, true, '2026-10-07'); c = L.applyAnswer(c, true, '2026-10-10'); c = L.applyAnswer(c, true, '2026-10-17');
assert.equal(c.box, 4); assert.equal(c.due, '2026-10-31');
c = L.applyAnswer(c, true, '2026-10-31'); assert.equal(c.mastered, true); assert.equal(c.due, '2026-11-30', 'learned -> 30-day check');
assert.equal(L.isDue(c, '2026-11-29'), false); assert.equal(L.isDue(c, '2026-11-30'), true, 'learned cards still come back for the check');
c = L.applyAnswer(c, true, '2026-11-30'); assert.equal(c.mastered, true); assert.equal(c.due, '2027-01-29', 'then every 60 days');
c = L.applyAnswer(c, true, '2027-04-20'); assert.equal(c.due, '2027-05-08', 'maintenance never lands after the exam');
c = L.applyAnswer(c, false, '2027-05-08'); assert.equal(c.mastered, false); assert.equal(c.box, 0, 'a lapse on a learned card reopens it');
// same-day repeat is one piece of evidence, not two
let d = L.applyAnswer(L.newCard(), true, t); d = L.applyAnswer(d, true, t);
assert.equal(d.box, 1); assert.equal(d.due, '2026-10-02'); assert.equal(d.correct, 2); assert.equal(d.seen, 2);
// manual tick: learned now, checked in 30 days; untick: back to the ladder, tomorrow
let m = L.setMastered(L.applyAnswer(L.newCard(), true, t), true, t); assert.equal(m.mastered, true); assert.equal(m.box, 5); assert.equal(m.due, '2026-10-31');
m = L.setMastered(m, false, t); assert.equal(m.mastered, false); assert.equal(m.due, '2026-10-02'); assert.ok(m.box >= 1 && m.box <= 4);
// countOnly leaves the schedule alone
let e = L.applyAnswer(L.newCard(), true, t); e = L.countOnly(e, '2026-10-01'); assert.equal(e.box, 1); assert.equal(e.due, '2026-10-02'); assert.equal(e.correct, 2);
assert.equal(L.nextReviewText({ mastered: false, due: '2026-10-08', seen: 1 }, t), '7 天後（10/08）再出一次。');
assert.equal(L.stageText({ box: 3, mastered: false }), '第 3 次答對，再 2 次就學會。');
assert.equal(L.daysBetween('2026-10-01', L.EXAM_DATE), 226);
assert.equal(L.addDays('2026-12-30', 3), '2027-01-02');
assert.ok(L.POS_REF.test('選項三說的是'), 'positional reference detected'); assert.ok(!L.POS_REF.test('選 8 是忘記乘 2'));
const sh = L.shuffled(4, L.mulberry32(5)); assert.deepEqual(sh.slice().sort(), [0, 1, 2, 3]);
assert.deepEqual(L.shuffled(4, L.mulberry32(5)), sh, 'seeded shuffle is deterministic');

// ---- synthetic bank ----
const bank = [];
const tiers = { M01: 'A', M02: 'A', M03: 'B', M06: 'C', M12: 'A', M18: 'A', M20: 'A' };
Object.keys(tiers).forEach((u, ui) => { for (let i = 1; i <= 10; i++) bank.push({ id: u + '-' + String(i).padStart(2, '0'), subject: 'math', unit: u, unit_num: ui + 1, unit_name: 'math ' + u, tier: tiers[u], difficulty: i % 3 ? '中' : '難', stem: 's', options: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'e' }); });
const soc = { H01: '歷史', H02: '歷史', H03: '歷史', G01: '地理', G02: '地理', C01: '公民' };
Object.keys(soc).forEach(u => { for (let i = 1; i <= 8; i++) bank.push({ id: u + '-' + String(i).padStart(2, '0'), subject: 'social', unit: u, unit_name: 'soc ' + u, area: soc[u], difficulty: i % 2 ? '中' : '難', stem: 's', options: ['a', 'b', 'c', 'd'], answer: 1, explanation: 'e' }); });
const settings = L.normalizeSettings({ budget: 20, mathNew: 5, socialNew: 5 });
const cards = {};
const p1 = L.pickDaily(bank, cards, settings, t), p2 = L.pickDaily(bank, cards, settings, t);
assert.deepEqual(p1, p2, 'deterministic per day');
assert.equal(p1.reviews.length, 0); assert.equal(p1.fresh.length, 10, 'budget 20, caps 5+5 -> 10 new');
const fm = p1.fresh.filter(id => id[0] === 'M'), fs_ = p1.fresh.filter(id => id[0] !== 'M');
assert.equal(fm.length, 5); assert.equal(fs_.length, 5);
const perUnit = {}; p1.fresh.forEach(id => { const u = id.slice(0, 3); perUnit[u] = (perUnit[u] || 0) + 1; assert.ok(perUnit[u] <= 2, 'max 2 per unit'); });
const areaCount = {}; fs_.forEach(id => { const a = soc[id.slice(0, 3)]; areaCount[a] = (areaCount[a] || 0) + 1; });
assert.ok(Math.max(...Object.values(areaCount)) - Math.min(...Object.values(areaCount)) <= 1, 'areas balanced');
assert.equal(new Set(p1.fresh).size, 10);
p1.fresh.forEach((id, i) => { cards[id] = L.applyAnswer(L.cardOf(cards, id), i >= 3, t); });
const nextDay = L.addDays(t, 1);
const p3 = L.pickDaily(bank, cards, settings, nextDay);
assert.equal(p3.reviews.length, 10, 'all 10 due next day'); assert.equal(p3.fresh.length, 10, '10 slots left -> 5+5 new');
assert.ok(p3.fresh.every(id => !cards[id])); assert.ok(!p3.reviews.some(id => p3.fresh.includes(id)));
const p4 = L.pickDaily(bank, cards, Object.assign({}, settings, { budget: 4 }), nextDay);
assert.equal(p4.reviews.length, 4); assert.equal(p4.fresh.length, 0, 'reviews fill the whole budget -> no new');
const p4b = L.pickDaily(bank, cards, Object.assign({}, settings, { budget: 13 }), nextDay);
assert.equal(p4b.reviews.length, 10); assert.equal(p4b.fresh.length, 3); assert.equal(p4b.fresh.filter(id => id[0] === 'M').length, 2);
const p4c = L.pickDaily(bank, cards, Object.assign({}, settings, { budget: 20, mathNew: 1 }), nextDay);
assert.equal(p4c.fresh.length, 6, 'math capped at 1 -> social takes up to its cap 5');
const ex = {}; p3.reviews.concat(p3.fresh).forEach(id => ex[id] = true);
const p5 = L.pickDaily(bank, cards, Object.assign({}, settings, { budget: 6, mathNew: 3, socialNew: 3 }), nextDay, ex);
assert.equal(p5.reviews.length, 0); assert.equal(p5.fresh.length, 6); assert.ok(p5.fresh.every(id => !ex[id]));
// unit practice: unseen first, then due, then the rest; today's unanswered daily ids excluded
const exToday = {}; exToday['M01-01'] = true;
const ids = L.pickUnit(bank, cards, 'M01', 5, L.mulberry32(1), nextDay, exToday);
assert.equal(ids.length, 5); assert.ok(ids.every(id => id.startsWith('M01')) && !ids.includes('M01-01'));
// wrong list, why tags, guess
const cards2 = { 'M01-01': L.applyAnswer(L.newCard(), false, t), 'M01-02': L.applyAnswer(L.applyAnswer(L.newCard(), false, '2026-09-30'), false, t), 'H01-01': L.setMastered(L.applyAnswer(L.newCard(), false, '2026-09-30'), true, t), 'G01-01': L.applyAnswer(L.newCard(), true, t) };
assert.deepEqual(L.wrongList(bank, cards2).map(q => q.id), ['M01-02', 'M01-01']);
let w = L.tagWhy(cards2['M01-01'], 'concept'); w = L.tagWhy(w, 'concept'); w = L.tagWhy(w, 'slip'); assert.deepEqual(w.why, { concept: 2, slip: 1 });
assert.equal(L.unitStats(bank, { 'M01-01': w }).M01.why.concept, 2);
let g = L.applyAnswer(L.applyAnswer(L.newCard(), true, t), true, nextDay); g = L.markGuess(g, nextDay);
assert.equal(g.box, 0); assert.equal(g.due, L.addDays(nextDay, 1)); assert.equal(g.correct, 2); assert.equal(g.wrong, 0);
// lights use what is known now: stable = mastered or on a streak
const st = L.unitStats(bank, cards2); assert.equal(st.M01.seen, 2); assert.equal(st.M01.stable, 0); assert.equal(st.G01.stable, 1);
assert.equal(L.light({ seen: 0 }), 'none'); assert.equal(L.light({ seen: 3, stable: 1 }), 'red'); assert.equal(L.light({ seen: 4, stable: 4 }), 'green'); assert.equal(L.light({ seen: 2, stable: 1 }), 'yellow');
// streak, strip, summary
const days = {}; days[t] = { answered: { a: { ok: true } } }; days[L.addDays(t, -1)] = { answered: { b: { ok: false } } }; days[L.addDays(t, -3)] = { answered: { c: { ok: true } } };
assert.equal(L.computeStreak(days, t), 2); assert.equal(L.computeStreak(days, L.addDays(t, 1)), 2); assert.equal(L.computeStreak(days, L.addDays(t, 2)), 0);
const strip = L.dayCounts(days, t, 14); assert.equal(strip.length, 14); assert.equal(strip[13].n, 1); assert.equal(strip[12].n, 1); assert.equal(strip[0].date, L.addDays(t, -13));
const sum = L.summarize(bank, cards, days, t); assert.equal(sum.seen, 10); assert.equal(sum.learning, 10); assert.equal(sum.untouched, bank.length - 10); assert.equal(sum.acc7, 67);
const sum2 = L.summarize(bank, cards2, {}, t); assert.equal(sum2.wrongOpen, 2); assert.equal(sum2.mastered, 1);
const ns = L.normalizeSettings({ mathNew: 5, socialNew: 5, reviewCap: 12 }); assert.equal(ns.budget, 20); assert.equal(L.normalizeSettings(null).mathNew, 4);
console.log('all logic tests passed');
