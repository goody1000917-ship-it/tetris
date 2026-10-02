const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
// 1) whole inline script must parse
new Function(script);
const logic = script.slice(script.indexOf('/*@logic-start*/'), script.indexOf('/*@logic-end*/'));
const vm = require('vm'); const ctx = {}; vm.createContext(ctx); vm.runInContext(logic, ctx);
const L = ctx;
const assert = require('assert');

// 2) SRS progression
let c = L.newCard(); const t = '2026-10-01';
c = L.applyAnswer(c, true, t); assert.equal(c.box, 1); assert.equal(c.due, '2026-10-02');
c = L.applyAnswer(c, true, '2026-10-02'); assert.equal(c.box, 2); assert.equal(c.due, '2026-10-05');
c = L.applyAnswer(c, false, '2026-10-05'); assert.equal(c.box, 0); assert.equal(c.due, '2026-10-06'); assert.equal(c.mastered, false);
c = L.applyAnswer(c, true, '2026-10-06'); c = L.applyAnswer(c, true, '2026-10-07'); c = L.applyAnswer(c, true, '2026-10-10'); c = L.applyAnswer(c, true, '2026-10-17');
assert.equal(c.box, 4); assert.equal(c.due, '2026-10-31');
c = L.applyAnswer(c, true, '2026-10-31'); assert.equal(c.mastered, true); assert.equal(c.due, null);
assert.equal(L.isDue(c, '2026-12-01'), false);
let m = L.setMastered(L.applyAnswer(L.newCard(), true, t), true, t); assert.equal(m.mastered, true);
m = L.setMastered(m, false, t); assert.equal(m.mastered, false); assert.equal(m.due, '2026-10-02');
assert.equal(L.nextReviewText({mastered:false, due:'2026-10-08'}, t), '7 天後再出（10/08）。');
assert.equal(L.daysBetween('2026-10-01', L.EXAM_DATE), 226);
// month/year rollover
assert.equal(L.addDays('2026-12-30', 3), '2027-01-02');

// 3) synthetic bank
const bank = [];
const tiers = {M01:'A',M02:'A',M03:'B',M06:'C',M12:'A',M18:'A',M20:'A'};
Object.keys(tiers).forEach((u, ui) => { for (let i = 1; i <= 10; i++) bank.push({ id: u + '-' + String(i).padStart(2,'0'), subject:'math', unit:u, unit_num: ui+1, unit_name:'math '+u, tier:tiers[u], difficulty: i%3?'中':'難', stem:'s', options:['a','b','c','d'], answer:0, explanation:'e' }); });
const soc = {H01:'歷史',H02:'歷史',H03:'歷史',G01:'地理',G02:'地理',C01:'公民'};
Object.keys(soc).forEach(u => { for (let i = 1; i <= 8; i++) bank.push({ id: u + '-' + String(i).padStart(2,'0'), subject:'social', unit:u, unit_name:'soc '+u, area:soc[u], difficulty: i%2?'中':'難', stem:'s', options:['a','b','c','d'], answer:1, explanation:'e' }); });
const settings = L.normalizeSettings({ budget: 20, mathNew: 5, socialNew: 5 });
const cards = {};
const p1 = L.pickDaily(bank, cards, settings, t);
const p2 = L.pickDaily(bank, cards, settings, t);
assert.deepEqual(p1, p2, 'deterministic per day');
assert.equal(p1.reviews.length, 0); assert.equal(p1.fresh.length, 10, 'budget 20, caps 5+5 -> 10 new');
const fm = p1.fresh.filter(id => id[0]==='M'), fs_ = p1.fresh.filter(id => id[0]!=='M');
assert.equal(fm.length, 5); assert.equal(fs_.length, 5);
const perUnit = {}; p1.fresh.forEach(id => { const u = id.slice(0,3); perUnit[u] = (perUnit[u]||0)+1; assert.ok(perUnit[u] <= 2, 'max 2 per unit'); });
const areaCount = {}; fs_.forEach(id => { const a = soc[id.slice(0,3)]; areaCount[a]=(areaCount[a]||0)+1; });
assert.ok(Math.max(...Object.values(areaCount)) - Math.min(...Object.values(areaCount)) <= 1, 'areas balanced: '+JSON.stringify(areaCount));
assert.equal(new Set(p1.fresh).size, 10);
// answer them all: first 3 wrong, rest right
p1.fresh.forEach((id, i) => { cards[id] = L.applyAnswer(L.cardOf(cards, id), i >= 3, t); });
const nextDay = L.addDays(t, 1);
const p3 = L.pickDaily(bank, cards, settings, nextDay);
assert.equal(p3.reviews.length, 10, 'all 10 due next day (3 wrong -> +1d, 7 right -> +1d)'); assert.equal(p3.fresh.length, 10, '10 slots left of 20 -> 5+5 new');
assert.ok(p3.fresh.every(id => !cards[id]), 'fresh excludes seen');
assert.ok(!p3.reviews.some(id => p3.fresh.includes(id)));
// reviewCap
const p4 = L.pickDaily(bank, cards, Object.assign({}, settings, {budget: 4}), nextDay);
assert.equal(p4.reviews.length, 4); assert.equal(p4.fresh.length, 0, 'reviews fill the whole budget -> no new');
const p4b = L.pickDaily(bank, cards, Object.assign({}, settings, {budget: 13}), nextDay);
assert.equal(p4b.reviews.length, 10); assert.equal(p4b.fresh.length, 3, '3 slots -> 2 math + 1 social');
assert.equal(p4b.fresh.filter(id => id[0]==='M').length, 2);
const p4c = L.pickDaily(bank, cards, Object.assign({}, settings, {budget: 20, mathNew: 1}), nextDay);
assert.equal(p4c.fresh.length, 6, 'math capped at 1 -> social takes up to its cap 5');
// exclude set used by addMore
const ex = {}; p3.reviews.concat(p3.fresh).forEach(id => ex[id] = true);
const p5 = L.pickDaily(bank, cards, Object.assign({}, settings, {budget: 6, mathNew:3, socialNew:3}), nextDay, ex);
assert.equal(p5.reviews.length, 0); assert.equal(p5.fresh.length, 6); assert.ok(p5.fresh.every(id => !ex[id]));
// weakness weighting: unit with low accuracy gets more weight
const stats = L.unitStats(bank, cards);
const weakUnit = Object.keys(stats).find(u => stats[u].answered >= 2 && stats[u].correct / stats[u].answered < 0.6);
// unit practice
const ids = L.pickUnit(bank, cards, 'M01', 5, L.mulberry32(1));
assert.equal(ids.length, 5); assert.ok(ids.every(id => id.startsWith('M01')));
// streak + summary
const days = {}; days[t] = { answered: { a: {ok:true} } }; days[L.addDays(t,-1)] = { answered: { b: {ok:false} } }; days[L.addDays(t,-3)] = { answered: { c: {ok:true} } };
assert.equal(L.computeStreak(days, t), 2);
assert.equal(L.computeStreak(days, L.addDays(t, 1)), 2, 'streak survives until end of next day');
assert.equal(L.computeStreak(days, L.addDays(t, 2)), 0);
const sum = L.summarize(bank, cards, days, t);
assert.equal(sum.seen, 10); assert.equal(sum.acc7, 67); assert.equal(sum.answered7, 3);
// light
assert.equal(L.light({answered:0}), 'none'); assert.equal(L.light({answered:3, correct:1}), 'red'); assert.equal(L.light({answered:4, correct:4}), 'green'); assert.equal(L.light({answered:2, correct:1}), 'yellow');
const ns = L.normalizeSettings({mathNew:5, socialNew:5, reviewCap:12}); assert.equal(ns.budget, 20, 'old settings get a budget'); assert.equal(L.normalizeSettings(null).mathNew, 4);
console.log('all logic tests passed; weak unit example:', weakUnit, JSON.stringify(areaCount));
