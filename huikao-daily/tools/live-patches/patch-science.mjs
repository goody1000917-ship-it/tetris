// Adds the 自然 subject (生物、理化) to the live 會考每日練 page. Same edits as science-subject.patch, done by
// text replacement so it also works when the page changed elsewhere. Stops at the first edit whose original text
// is missing and names it, without writing anything.
// usage (from the repo root): node huikao-daily/tools/live-patches/patch-science.mjs huikao-daily/index.html
import fs from 'fs';
const file = process.argv[2] || 'huikao-daily/index.html';
let s = fs.readFileSync(file, 'utf8');
if (s.includes("science: '自然'")) { console.log('already has 自然; nothing to do'); process.exit(0); }
const EDITS = [
 [
  "--warn-soft:#FBF0D6;",
  "--warn-soft:#FBF0D6; --sci:#0B6E78; --sci-soft:#DDF1F2;",
  1
 ],
 [
  "--warn-soft:#3A2D14;",
  "--warn-soft:#3A2D14; --sci:#62C6CF; --sci-soft:#143139;",
  2
 ],
 [
  ".chip.english{color:var(--ok);border-color:var(--ok);background:var(--ok-soft)}",
  ".chip.english{color:var(--ok);border-color:var(--ok);background:var(--ok-soft)}\n.chip.science{color:var(--sci);border-color:var(--sci);background:var(--sci-soft)}",
  1
 ],
 [
  "englishNew: 3, hardBias: false };",
  "englishNew: 3, scienceNew: 3, hardBias: false };",
  1
 ],
 [
  "var SUBJECTS = ['math', 'social', 'english'];",
  "var SUBJECTS = ['math', 'social', 'english', 'science'];",
  1
 ],
 [
  "var SUBJECT_NAME = { math: '數學', social: '社會', english: '英文' };",
  "var SUBJECT_NAME = { math: '數學', social: '社會', english: '英文', science: '自然' };",
  1
 ],
 [
  "var NEW_KEY = { math: 'mathNew', social: 'socialNew', english: 'englishNew' };",
  "var NEW_KEY = { math: 'mathNew', social: 'socialNew', english: 'englishNew', science: 'scienceNew' };",
  1
 ],
 [
  "var AREAS = ['歷史', '地理', '公民'];",
  "var AREAS = ['歷史', '地理', '公民'];\nvar SCI_AREAS = ['生物', '理化'];",
  1
 ],
 [
  "englishNew: Math.max(0, Math.min(10, o.englishNew | 0)), hardBias",
  "englishNew: Math.max(0, Math.min(10, o.englishNew | 0)), scienceNew: Math.max(0, Math.min(10, o.scienceNew | 0)), hardBias",
  1
 ],
 [
  "var areas = AREAS.filter(function (a) {",
  "var areas = (Array.isArray(balanceAreas) ? balanceAreas : AREAS).filter(function (a) {",
  1
 ],
 [
  "pickNew(pools[sub], want[sub], rng, wfn, 2, sub === 'social')",
  "pickNew(pools[sub], want[sub], rng, wfn, 2, sub === 'social' || (sub === 'science' && SCI_AREAS))",
  1
 ],
 [
  "  var a3 = Math.ceil(n / 3), b3 = Math.ceil((n - a3) / 2);\n  var settings = Object.assign({}, S.settings, { budget: n, mathNew: a3, socialNew: b3, englishNew: n - a3 - b3 });",
  "  var split = {}, left = n;\n  SUBJECTS.forEach(function (sub, i) { var k = Math.ceil(left / (SUBJECTS.length - i)); split[NEW_KEY[sub]] = k; left -= k; });\n  var settings = Object.assign({}, S.settings, split, { budget: n });",
  1
 ],
 [
  "(q.subject === 'social' ? esc(q.area || '社會') : SUBJECT_NAME[q.subject] || '')",
  "(q.subject === 'social' || q.subject === 'science' ? esc(q.area || SUBJECT_NAME[q.subject]) : SUBJECT_NAME[q.subject] || '')",
  1
 ],
 [
  "['english', '英文', 'subject'], ['write', '英文造句', 'write']",
  "['english', '英文', 'subject'], ['science', '自然', 'subject'], ['write', '英文造句', 'write']",
  1
 ],
 [
  "(S.settings.mathNew + S.settings.socialNew + S.settings.englishNew === 0) ? '三科的新題上限都是 0",
  "(S.settings.mathNew + S.settings.socialNew + S.settings.englishNew + S.settings.scienceNew === 0) ? '各科的新題上限都是 0",
  1
 ],
 [
  "[['all', '全部'], ['math', '數學'], ['social', '社會'], ['english', '英文']]",
  "[['all', '全部'], ['math', '數學'], ['social', '社會'], ['english', '英文'], ['science', '自然']]",
  1
 ],
 [
  "  var eng = Object.keys(stats).filter(function (u) { return stats[u].subject === 'english'; }).sort();",
  "  SCI_AREAS.forEach(function (area) {\n    var list = Object.keys(stats).filter(function (u) { return stats[u].subject === 'science' && stats[u].area === area; }).sort();\n    if (!list.length) return;\n    var seenN = list.filter(function (u) { return stats[u].seen; }).length;\n    html += '<details><summary><h2>自然 · ' + esc(area) + '</h2><span class=\"small muted num\">' + seenN + ' / ' + list.length + ' 單元做過</span></summary><div class=\"units\">' + list.map(function (u) { return unitRow(stats[u], stats[u].name); }).join('') + '</div></details>';\n  });\n  var eng = Object.keys(stats).filter(function (u) { return stats[u].subject === 'english'; }).sort();",
  1
 ],
 [
  "function newHintText(m, s, e) { return '沒有複習題的日子會出 數學 ' + m + ' + 社會 ' + s + ' + 英文 ' + e + ' = ' + (m + s + e) + ' 題新題。'; }",
  "function newHintText(m, s, e, n) { n = n || 0; return '沒有複習題的日子會出 數學 ' + m + ' + 社會 ' + s + ' + 英文 ' + e + ' + 自然 ' + n + ' = ' + (m + s + e + n) + ' 題新題。'; }",
  1
 ],
 [
  "var st = S.settings, counts = { math: 0, social: 0, english: 0 };",
  "var st = S.settings, counts = { math: 0, social: 0, english: 0, science: 0 };",
  1
 ],
 [
  "  html += '<div class=\"field\"><label for=\"englishNew\">英文新題上限</label>",
  "  html += '<div class=\"field\"><label for=\"scienceNew\">自然新題上限</label><input type=\"number\" id=\"scienceNew\" min=\"0\" max=\"10\" value=\"' + st.scienceNew + '\"></div>';\n  html += '<div class=\"field\"><label for=\"englishNew\">英文新題上限</label>",
  1
 ],
 [
  "newHintText(st.mathNew, st.socialNew, st.englishNew)",
  "newHintText(st.mathNew, st.socialNew, st.englishNew, st.scienceNew)",
  1
 ],
 [
  "英文文法 ' + counts.english + ' 題，只有中等與難題。",
  "英文文法 ' + counts.english + ' 題、自然 ' + counts.science + ' 題，只有中等與難題。",
  1
 ],
 [
  "if (e.target.id === 'mathNew' || e.target.id === 'socialNew' || e.target.id === 'englishNew') {",
  "if (e.target.id === 'mathNew' || e.target.id === 'socialNew' || e.target.id === 'englishNew' || e.target.id === 'scienceNew') {",
  1
 ],
 [
  "newHintText(num('mathNew'), num('socialNew'), num('englishNew'))",
  "newHintText(num('mathNew'), num('socialNew'), num('englishNew'), num('scienceNew'))",
  1
 ],
 [
  "englishNew: v('englishNew', 0, 10), hardBias",
  "englishNew: v('englishNew', 0, 10), scienceNew: v('scienceNew', 0, 10), hardBias",
  1
 ]
];
for (const [i, [from, to, count]] of EDITS.entries()) {
  const n = s.split(from).length - 1;
  if (n !== count) { console.error(`edit ${i + 1} of ${EDITS.length}: expected ${count} copies of this text, found ${n}:\n${from.slice(0, 200)}`); process.exit(1); }
  s = s.split(from).join(to);
}
fs.writeFileSync(file, s);
console.log(`added 自然: ${EDITS.length} edits applied to ${file}`);
