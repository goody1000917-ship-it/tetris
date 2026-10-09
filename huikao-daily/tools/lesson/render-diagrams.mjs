// Renders every diagram of the lesson (and optionally bank questions) to PNG, one file per diagram, plus an
// index.json mapping file -> JSON path and the text it illustrates. usage:
//   node render-diagrams.mjs <similar.html> <lesson-data.json> <outDir> [bank-questions.json]
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [pageFile, dataFile, outDir, bankFile] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const items = [];
data.sections.forEach((s, si) => s.blocks.forEach((b, bi) => {
  const base = `sections[${si}].blocks[${bi}]`;
  if (b.diagram) items.push({ path: base, sec: s.id, text: b.stem || b.caption || (b.lines || []).join(' / ') || '', diagram: b.diagram });
  (b.variants || []).forEach((v, vi) => { if (v.diagram) items.push({ path: `${base}.variants[${vi}]`, sec: s.id, text: v.stem, diagram: v.diagram }); });
}));
data.exam.forEach((p, pi) => p.variants.forEach((v, vi) => { if (v.diagram) items.push({ path: `exam[${pi}].variants[${vi}]`, sec: p.type, text: v.stem, diagram: v.diagram }); }));
if (bankFile) JSON.parse(fs.readFileSync(bankFile, 'utf8')).forEach(q => { if (q.figure_svg) items.push({ path: `bank:${q.id}`, sec: q.id, text: q.stem, svg: q.figure_svg }); });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto('file://' + pageFile);
const index = [];
for (let i = 0; i < items.length; i++) {
  const it = items[i];
  await page.evaluate(({ d, svg }) => {
    const v = document.getElementById('view');
    v.innerHTML = '<div id="shot" class="card" style="width:380px"><div class="dgw" style="max-width:360px;margin:auto">' + (svg ? '<div style="color:var(--ink)">' + svg + '</div>' : dgRenderPublic(d)) + '</div></div>';
  }, { d: it.diagram, svg: it.svg });
  const file = `${String(i).padStart(3, '0')}-${it.sec}.png`;
  await page.locator('#shot').screenshot({ path: `${outDir}/${file}` });
  index.push({ file, path: it.path, text: it.text });
}
fs.writeFileSync(`${outDir}/index.json`, JSON.stringify(index, null, 1));
await browser.close();
console.log('rendered', items.length);
