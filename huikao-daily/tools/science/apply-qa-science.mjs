// Applies the science QA workflow's fixes to the audit file and writes the final bank entries.
// usage: node apply-qa-science.mjs <audit.json> <out.json> <qa task outputs...>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [auditFile, out, ...qaFiles] = process.argv.slice(2);
const html = fs.readFileSync(path.join(here, '..', 'lesson', 'similar.src.html'), 'utf8');
const dgRenderRaw = new Function(html.slice(html.indexOf('/*@dg-start*/'), html.indexOf('/*@dg-end*/')) + '\nreturn dgRender;')();
// science graphs carry their own axis names (時間（s）, 位置（m）), so the default x / y / O labels are left out
const dgRender = (d, o) => dgRenderRaw(d.axes ? Object.assign({}, d, { axes: Object.assign({}, d.axes, { plain: true }) }) : d, o);
const audit = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
const fixes = qaFiles.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')).result.fixes);
const byId = new Map(audit.map(q => [q.id, q]));
let changed = 0, dropped = [];
for (const f of fixes) {
  if (f.error || f.kept) { console.log('not applied', f.unit, f.error || 'kept as is'); continue; }
  for (const q of f.questions) {
    const old = byId.get(q.id); if (!old) continue;
    const next = Object.assign({}, old, { topic: q.topic, difficulty: q.difficulty, stem: q.stem, options: q.options, answer: q.answer, explanation: q.explanation });
    if (q.diagram && q.diagram.points && q.diagram.points.length) next.diagram = q.diagram; else delete next.diagram;
    if (JSON.stringify(next) !== JSON.stringify(old)) changed++;
    byId.set(q.id, next);
  }
  for (const id of f.dropped || []) { byId.delete(id); dropped.push(id); }
}
// renumber within each unit so ids stay continuous
const units = {};
for (const q of byId.values()) (units[q.unit] = units[q.unit] || []).push(q);
const bank = [], finalAudit = [];
for (const u of Object.keys(units).sort()) units[u].sort((a, b) => a.id.localeCompare(b.id)).forEach((q, i) => {
  const id = `${u}-${String(i + 1).padStart(2, '0')}`;
  const a = Object.assign({}, q, { id }); finalAudit.push(a);
  const b = Object.assign({}, a); delete b.diagram;
  if (a.diagram) b.figure_svg = dgRender(a.diagram, { inline: true, label: '題目附圖' });
  bank.push(b);
});
fs.writeFileSync(out, JSON.stringify(bank));
fs.writeFileSync(auditFile.replace(/\.json$/, '.final.json'), JSON.stringify(finalAudit, null, 1));
console.log(`applied: ${changed} questions revised, ${dropped.length} dropped (${dropped.join(', ') || 'none'}); bank ${bank.length}`);
