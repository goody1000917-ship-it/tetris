// Turns science-workflow results into question-bank entries (subject "science", ids B01-01…, P01-01…).
// usage: node build-science.mjs <out.json> [--audit audit.json] <workflow output files...>
// --audit also writes the same questions with their figure specs (diagram) instead of SVG, for review and fixing.
// Figures are drawn from their coordinate specs with the lesson page's dgRender (../lesson/similar.src.html).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), ai = argv.indexOf('--audit');
const auditOut = ai >= 0 ? argv.splice(ai, 2)[1] : null;
const [out, ...files] = argv;
const html = fs.readFileSync(path.join(here, '..', 'lesson', 'similar.src.html'), 'utf8');
const dgRenderRaw = new Function(html.slice(html.indexOf('/*@dg-start*/'), html.indexOf('/*@dg-end*/')) + '\nreturn dgRender;')();
// science graphs carry their own axis names (時間（s）, 位置（m）), so the default x / y / O labels are left out
const dgRender = (d, o) => dgRenderRaw(d.axes ? Object.assign({}, d, { axes: Object.assign({}, d.axes, { plain: true }) }) : d, o);
const wf = fs.readFileSync(path.join(here, 'science-workflow.js'), 'utf8');
const SCI = new Function(wf.slice(wf.indexOf('const SCI = {'), wf.indexOf('const SCI_STYLE')) + '\nreturn SCI;')();
const all = [];
for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const r of (raw.result || raw).results) {
    if (r.error) console.log('batch error', r.id, r.error);
    all.push(...(r.questions || []));
  }
}
const byUnit = {};
for (const q of all) (byUnit[q.unit] = byUnit[q.unit] || []).push(q);
const POS_REF = /選項[一二三四]|第[一二三四]個選項|[①②③④]|\([A-D]\)|（[A-D]）/;
const counts = { 生物: [0, 0, 0, 0], 理化: [0, 0, 0, 0] };
const bank = [], audit = [];
for (const unit of Object.keys(byUnit).sort()) {
  const meta = SCI[unit];
  byUnit[unit].forEach((q, i) => {
    let options = q.options.slice(), answer = q.answer;
    const c = counts[meta.area];
    if (!POS_REF.test(q.explanation)) {
      const target = c.indexOf(Math.min(...c)), shift = (target - answer + 4) % 4;
      if (shift) { options = options.slice(-shift).concat(options.slice(0, -shift)); answer = (answer + shift) % 4; }
    }
    c[answer]++;
    const item = { id: `${unit}-${String(i + 1).padStart(2, '0')}`, subject: 'science', area: meta.area, unit, unit_name: meta.name,
      topic: q.topic, difficulty: q.difficulty, stem: q.stem, options, answer, explanation: q.explanation };
    audit.push(Object.assign({}, item, q.diagram && q.diagram.points && q.diagram.points.length ? { diagram: q.diagram } : {}));
    if (q.diagram && q.diagram.points && q.diagram.points.length) item.figure_svg = dgRender(q.diagram, { inline: true, label: '題目附圖' });
    bank.push(item);
  });
}
fs.writeFileSync(out, JSON.stringify(bank));
if (auditOut) fs.writeFileSync(auditOut, JSON.stringify(audit, null, 1));
const per = {}; for (const q of bank) per[q.unit] = (per[q.unit] || 0) + 1;
console.log(`science questions ${bank.length} (生物 ${bank.filter(q => q.area === '生物').length}, 理化 ${bank.filter(q => q.area === '理化').length}); with figures ${bank.filter(q => q.figure_svg).length}`);
console.log(Object.entries(per).map(([u, n]) => `${u} ${n}`).join(', '));
console.log('answer positions', JSON.stringify(counts));
