# Builds live-patches/patch-chinese.mjs (the 國文 subject) from anchors copied out of the 自然-patched live page, so
# every "from" text is exact. usage: python3 -I build-patch.py <自然-patched index.html> <out .mjs>
import json, sys
page = open(sys.argv[1], encoding='utf-8').read()
E = []
def edit(frm, to, count=1):
    n = page.count(frm)
    assert n == count, f'expected {count} copies, found {n}: {frm[:90]}'
    assert to != frm
    E.append([frm, to, count])

# colours: 國文 gets a plum tone in both themes; links styled as buttons on the 進度 tab
edit("--sci:#0B6E78; --sci-soft:#DDF1F2;", "--sci:#0B6E78; --sci-soft:#DDF1F2; --chi:#8E3B66; --chi-soft:#F7E4EE;")
edit("--sci:#62C6CF; --sci-soft:#143139;", "--sci:#62C6CF; --sci-soft:#143139; --chi:#E6A2C4; --chi-soft:#3A1D2C;", 2)
edit(".chip.science{color:var(--sci);border-color:var(--sci);background:var(--sci-soft)}",
     ".chip.science{color:var(--sci);border-color:var(--sci);background:var(--sci-soft)}\n.chip.chinese{color:var(--chi);border-color:var(--chi);background:var(--chi-soft)}\n.learn a.btn{text-decoration:none;color:inherit}")
# the header named only the first two subjects; with 國文 the site covers all five
edit('<div class="sub">數學 · 社會 · 遺忘曲線</div>', '<div class="sub">五科 · 遺忘曲線</div>')
# settings, subject lists, dealing order
edit("englishNew: 3, scienceNew: 3, hardBias: false };", "englishNew: 3, scienceNew: 3, chineseNew: 3, hardBias: false };")
edit("var SUBJECTS = ['math', 'social', 'english', 'science'];", "var SUBJECTS = ['math', 'social', 'english', 'science', 'chinese'];")
edit("var NEW_ORDER = ['science', 'math', 'social', 'english'];",
     "var NEW_ORDER = ['science', 'chinese', 'math', 'social', 'english'];   // 國文 was added after 自然 and also starts with no cards")
edit("var SUBJECT_NAME = { math: '數學', social: '社會', english: '英文', science: '自然' };",
     "var SUBJECT_NAME = { math: '數學', social: '社會', english: '英文', science: '自然', chinese: '國文' };")
edit("var NEW_KEY = { math: 'mathNew', social: 'socialNew', english: 'englishNew', science: 'scienceNew' };",
     "var NEW_KEY = { math: 'mathNew', social: 'socialNew', english: 'englishNew', science: 'scienceNew', chinese: 'chineseNew' };")
edit("var SCI_AREAS = ['生物', '理化'];", "var SCI_AREAS = ['生物', '理化'];\nvar CHI_AREAS = ['字音', '字形', '字義'];")
edit("scienceNew: Math.max(0, Math.min(10, o.scienceNew | 0)), hardBias",
     "scienceNew: Math.max(0, Math.min(10, o.scienceNew | 0)), chineseNew: Math.max(0, Math.min(10, o.chineseNew | 0)), hardBias")
edit("sub === 'social' || (sub === 'science' && SCI_AREAS))", "sub === 'social' || (sub === 'science' && SCI_AREAS) || (sub === 'chinese' && CHI_AREAS))")
# question card: area chip for 國文, and a 會考 source chip for past exam questions
edit("(q.subject === 'social' || q.subject === 'science' ? esc(q.area || SUBJECT_NAME[q.subject])",
     "(q.subject === 'social' || q.subject === 'science' || q.subject === 'chinese' ? esc(q.area || SUBJECT_NAME[q.subject])")
edit("(tw ? '<span class=\"chip ai\">AI 出的題</span>' : '')",
     "(tw ? '<span class=\"chip ai\">AI 出的題</span>' : '') + (!tw && q.source && /年會考/.test(q.source) ? '<span class=\"chip\">' + esc(q.source) + '</span>' : '')")
# AI twins rewrite a question during reviews; 注音 and 字形 are exactly what a generated question gets wrong, so 國文
# reviews keep the checked bank questions
edit("function twinWanted(ses, id) { return !(S.byId[id] && S.byId[id].figure_img) && ",
     "function twinWanted(ses, id) { return !(S.byId[id] && (S.byId[id].figure_img || S.byId[id].subject === 'chinese')) && ")
edit("['science', '自然', 'subject'], ['write', '英文造句', 'write']", "['science', '自然', 'subject'], ['chinese', '國文', 'subject'], ['write', '英文造句', 'write']")
edit("S.settings.englishNew + S.settings.scienceNew === 0)", "S.settings.englishNew + S.settings.scienceNew + S.settings.chineseNew === 0)")
edit("['english', '英文'], ['science', '自然']]", "['english', '英文'], ['science', '自然'], ['chinese', '國文']]")
# 進度: the lessons on the same site, and 國文 · 字音／字形／字義
edit("  var N = S.bank.length || 1;\n",
     "  // the lessons live on the same site (learn/*.html)\n  html += '<section class=\"card learn\" style=\"padding:12px 16px\"><h3 style=\"margin:0 0 8px\">教學</h3><div class=\"row\"><a class=\"btn mini\" href=\"learn/similar.html\">相似形・比例線段</a><a class=\"btn mini\" href=\"learn/repro.html\">生殖：把錯題弄懂</a></div></section>';\n  var N = S.bank.length || 1;\n")
edit("  var eng = Object.keys(stats).filter(function (u) { return stats[u].subject === 'english'; }).sort();",
     "  CHI_AREAS.forEach(function (area) {\n    var list = Object.keys(stats).filter(function (u) { return stats[u].subject === 'chinese' && stats[u].area === area; }).sort();\n    if (!list.length) return;\n    var seenN = list.filter(function (u) { return stats[u].seen; }).length;\n    html += '<details><summary><h2>國文 · ' + esc(area) + '</h2><span class=\"small muted num\">' + seenN + ' / ' + list.length + ' 單元做過</span></summary><div class=\"units\">' + list.map(function (u) { return unitRow(stats[u], stats[u].name); }).join('') + '</div></details>';\n  });\n  var eng = Object.keys(stats).filter(function (u) { return stats[u].subject === 'english'; }).sort();")
# settings page
edit("function newHintText(m, s, e, n) { n = n || 0; return '沒有複習題的日子會出 數學 ' + m + ' + 社會 ' + s + ' + 英文 ' + e + ' + 自然 ' + n + ' = ' + (m + s + e + n) + ' 題新題。'; }",
     "function newHintText(m, s, e, n, c) { n = n || 0; c = c || 0; return '沒有複習題的日子會出 數學 ' + m + ' + 社會 ' + s + ' + 英文 ' + e + ' + 自然 ' + n + ' + 國文 ' + c + ' = ' + (m + s + e + n + c) + ' 題新題。'; }")
edit("counts = { math: 0, social: 0, english: 0, science: 0 };", "counts = { math: 0, social: 0, english: 0, science: 0, chinese: 0 };")
edit("  html += '<div class=\"field\"><label for=\"englishNew\">英文新題上限</label>",
     "  html += '<div class=\"field\"><label for=\"chineseNew\">國文新題上限</label><input type=\"number\" id=\"chineseNew\" min=\"0\" max=\"10\" value=\"' + st.chineseNew + '\"></div>';\n  html += '<div class=\"field\"><label for=\"englishNew\">英文新題上限</label>")
edit("newHintText(st.mathNew, st.socialNew, st.englishNew, st.scienceNew)", "newHintText(st.mathNew, st.socialNew, st.englishNew, st.scienceNew, st.chineseNew)")
edit("、自然 ' + counts.science + ' 題，只有中等與難題。", "、自然 ' + counts.science + ' 題、國文形音義 ' + counts.chinese + ' 題，只有中等與難題。")
edit("|| e.target.id === 'scienceNew') {", "|| e.target.id === 'scienceNew' || e.target.id === 'chineseNew') {")
edit("newHintText(num('mathNew'), num('socialNew'), num('englishNew'), num('scienceNew'))", "newHintText(num('mathNew'), num('socialNew'), num('englishNew'), num('scienceNew'), num('chineseNew'))")
edit("scienceNew: v('scienceNew', 0, 10), hardBias", "scienceNew: v('scienceNew', 0, 10), chineseNew: v('chineseNew', 0, 10), hardBias")

HEAD = """// Adds the 國文 subject (形音義：字音、字形、字義) to the live 會考每日練 page, on top of patch-science.mjs (自然),
// plus a 教學 section on the 進度 tab (links to learn/*.html) and a source chip on past 會考 questions. Same engine
// as patch-science.mjs: an edit whose result is already in the page is skipped, nothing is written unless every
// edit ends up in place and the page's script still parses. If an edit's original text is missing, change that
// EDITS entry to match this page (not the page itself) and run it again.
// usage (from the repo root): node huikao-daily/tools/live-patches/patch-chinese.mjs huikao-daily/index.html
// (generated by huikao-daily/tools/chinese/build-patch.py from the 自然-patched page)
import fs from 'fs';
const file = process.argv[2] || 'huikao-daily/index.html';
let s = fs.readFileSync(file, 'utf8');
if (!s.includes("science: '自然'")) { console.error('this page has no 自然 yet: run patch-science.mjs first'); process.exit(1); }
"""
TAIL = """const has = (text, count) => s.split(text).length - 1 >= count;
const parses = text => {
  for (const [, code] of text.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)) {
    try { new Function(code); } catch (e) { return e.message; }
  }
  return '';
};
const broken = text => { const err = parses(text); if (err) { console.error(`the patched page would have a script error (${err}); nothing was written. Check the EDITS entries that were changed.`); process.exit(1); } };
if (EDITS.every(([, to, count]) => has(to, count))) { broken(s); console.log('already has 國文; nothing to do'); process.exit(0); }
let applied = 0;
for (const [i, [from, to, count]] of EDITS.entries()) {
  if (has(to, count)) continue;
  const n = s.split(from).length - 1;
  if (n !== count) { console.error(`edit ${i + 1} of ${EDITS.length}: expected ${count} copies of this text, found ${n}:\\n${from.slice(0, 200)}`); process.exit(1); }
  s = s.split(from).join(to);
  applied++;
}
const missing = EDITS.map(([, to, count], i) => has(to, count) ? 0 : i + 1).filter(Boolean);
if (missing.length) { console.error(`edits ${missing.join(', ')} did not end up in the page; nothing was written`); process.exit(1); }
broken(s);
fs.writeFileSync(file, s);
console.log(`added 國文: ${applied} of ${EDITS.length} edits applied to ${file}`);
"""
body = 'const EDITS = [\n' + ',\n'.join(' [\n  ' + json.dumps(f, ensure_ascii=False) + ',\n  ' + json.dumps(t, ensure_ascii=False) + ',\n  ' + str(c) + '\n ]' for f, t, c in E) + '\n];\n'
open(sys.argv[2], 'w', encoding='utf-8').write(HEAD + body + TAIL)
print(f'{len(E)} edits written to {sys.argv[2]}')
