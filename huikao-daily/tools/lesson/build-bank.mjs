// Turns the bank workflow result into question-bank entries for 連比例與相似形 (M17).
// usage: node build-bank.mjs <workflow output> <similar.src.html> <outDir> <firstNumber>
// writes m17-new-questions.json (originals only: the live page has no sibling support) and
// m17-new-with-siblings.json (originals + siblings with variant_of, for the repo page).
import fs from 'fs';
const [outFile, htmlFile, outDir, firstArg] = process.argv.slice(2);
const html = fs.readFileSync(htmlFile, 'utf8');
const src = html.slice(html.indexOf('/*@dg-start*/'), html.indexOf('/*@dg-end*/'));
const dgRender = new Function(src + '\nreturn dgRender;')();
const raw = JSON.parse(fs.readFileSync(outFile, 'utf8'));
const fams = (raw.families || raw.result.results.flatMap(r => r.families || [])).slice().sort((a, b) => a.key.localeCompare(b.key));
let n = Number(firstArg) || 13;
const restyle = text => {
  const lines = String(text).split('\n').map(s => s.trim()).filter(Boolean);
  let k = 0;
  return lines.map(l => /^(其他選項|錯誤選項|常見錯誤)/.test(l) ? (l.startsWith('常見錯誤') ? l : '常見錯誤：' + l) : /^第\s*\d+\s*步/.test(l) ? (k++, l) : `第 ${++k} 步：${l}`).join('\n');
};
const originals = [], all = [];
for (const f of fams) {
  const id = `M17-${String(n++).padStart(2, '0')}`;
  f.members.forEach((m, j) => {
    const q = { id: j ? `${id}v${j}` : id, subject: 'math', unit: 'M17', unit_name: '連比例與相似形', topic: f.topic, difficulty: f.difficulty,
      stem: m.stem, options: m.options, answer: m.answer, explanation: restyle(m.explanation), unit_num: 17, tier: 'A' };
    if (j) q.variant_of = id;
    if (m.diagram && m.diagram.points && m.diagram.points.length) q.figure_svg = dgRender(m.diagram, { inline: true, label: '題目附圖' });
    all.push(q);
    if (!j) originals.push(q);
  });
}
fs.writeFileSync(`${outDir}/m17-new-questions.json`, JSON.stringify(originals));
fs.writeFileSync(`${outDir}/m17-new-with-siblings.json`, JSON.stringify(all));
console.log(`families ${fams.length}: originals ${originals.length}, with siblings ${all.length}; ids ${originals[0]?.id}..${originals.at(-1)?.id}`);
