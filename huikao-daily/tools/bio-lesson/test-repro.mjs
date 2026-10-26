// Smoke-tests the 生殖 lesson page at phone width. usage: node test-repro.mjs <page.html path or http(s) URL> <shots dir>
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [file, shots] = process.argv.slice(2);
const browser = await chromium.launch();
const fails = [], ok = m => console.log('ok  ', m), bad = m => { fails.push(m); console.log('FAIL', m); };
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 760 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errs.push('request failed ' + r.url()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(/^https?:/.test(file) ? file : 'file://' + file);
  const overflow = async where => { const o = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth); o > 1 ? bad(`${scheme} ${where}: horizontal overflow ${o}px`) : ok(`${scheme} ${where}: no overflow`); };
  await overflow('home');
  if (scheme === 'light') await page.screenshot({ path: `${shots}/home.png` });
  const secs = await page.evaluate(() => JSON.parse(document.getElementById('lesson-data').textContent).sections.map(s => s.id));
  for (const id of secs) {
    await page.evaluate(h => { location.hash = h; }, id); await page.waitForTimeout(80);
    await overflow('section ' + id);
    const n = await page.evaluate(() => ({ mis: document.querySelectorAll('.mis').length, svg: document.querySelectorAll('[data-demo] svg').length, tb: document.querySelectorAll('table.tb').length, img: [...document.querySelectorAll('.photo img')].filter(i => i.complete && i.naturalWidth > 0).length, imgAll: document.querySelectorAll('.photo img').length }));
    ok(`${scheme} ${id}: ${n.mis} mistake cards, ${n.svg} demo svgs, ${n.tb} tables, images ${n.img}/${n.imgAll} loaded`);
    if (n.img !== n.imgAll) { await page.waitForTimeout(400); }
  }
  // demo: every organism x process x stage renders, captions present, no bar overflow outside the svg box
  await page.evaluate(h => { location.hash = h; }, secs[0]); await page.waitForTimeout(80);
  const demo = page.locator('[data-demo]').first();
  if (await demo.count()) {
    await demo.scrollIntoViewIfNeeded();
    for (const org of ['fly', 'pea', 'human']) for (const proc of ['cell', 'meiosis', 'fert']) {
      await demo.locator(`[data-org="${org}"]`).click(); await demo.locator(`[data-proc="${proc}"]`).click();
      for (let st = 0; st < 6; st++) {
        const info = await demo.evaluate(el => { const svg = el.querySelector('svg'), vb = svg.viewBox.baseVal, rs = [...svg.querySelectorAll('rect')]; const out = rs.filter(r => { const b = r.getBBox(); return b.x < -0.5 || b.y < -0.5 || b.x + b.width > vb.width + 0.5 || b.y + b.height > vb.height + 0.5; }).length; return { bars: rs.length, out, cap: el.querySelector('[data-r=cap]').textContent, pos: el.querySelector('[data-r=pos]').textContent, next: el.querySelector('[data-st="1"]').disabled, rt: el.querySelector('[data-r=rt]').textContent }; });
        if (info.out) bad(`${scheme} demo ${org}/${proc} ${info.pos}: ${info.out} bars outside the drawing`);
        if (!info.cap) bad(`${scheme} demo ${org}/${proc}: empty caption`);
        if (scheme === 'light' && (org === 'human' || org === 'fly')) await demo.screenshot({ path: `${shots}/demo-${org}-${proc}-${st}.png` });
        if (info.next) break;
        await demo.locator('[data-st="1"]').click();
      }
    }
    ok(`${scheme} demo: all organism/process/stage combinations rendered`);
    await overflow('demo');
  } else bad('no demo in first section');
  // mistake card: marks, understood, redo
  const card = page.locator('.mis').first();
  await card.scrollIntoViewIfNeeded();
  const marks = await card.evaluate(el => ({ ok: el.querySelectorAll('.opt.ok').length, bad: el.querySelectorAll('.opt.bad').length, steps: el.querySelectorAll('.steps li').length }));
  marks.ok === 1 && marks.bad >= 1 && marks.steps > 0 ? ok(`${scheme} mistake marks ${JSON.stringify(marks)}`) : bad(`${scheme} mistake marks ${JSON.stringify(marks)}`);
  if (scheme === 'light') await card.screenshot({ path: `${shots}/mistake.png` });
  const before = await page.locator('#secMis').textContent();
  await card.locator('[data-act="mis-ok"]').click();
  const after = await page.locator('#secMis').textContent();
  +after === +before + 1 ? ok(`${scheme} 我懂了 counts (${before} → ${after})`) : bad(`${scheme} 我懂了 did not count (${before} → ${after})`);
  await card.locator('[data-act="mis-redo"]').click();
  const redoBtns = await card.locator('[data-act="mis-pick"]').count();
  redoBtns === 4 ? ok(`${scheme} redo shows 4 clickable options`) : bad(`${scheme} redo shows ${redoBtns} options`);
  const ans = await page.evaluate(() => { const id = document.querySelector('.mis').id.slice(4); const d = JSON.parse(document.getElementById('lesson-data').textContent); for (const s of d.sections) for (const b of s.blocks) if (b.id === id) return b.answer; });
  await card.locator(`[data-act="mis-pick"][data-i="${(ans + 1) % 4}"]`).click();
  await card.locator(`[data-act="mis-pick"][data-i="${ans}"]`).click();
  const fb = await card.locator('.fb.ok').count();
  fb ? ok(`${scheme} redo: wrong then right gives feedback`) : bad(`${scheme} redo feedback missing`);
  if (scheme === 'light') await card.screenshot({ path: `${shots}/mistake-redo.png` });
  await card.locator('[data-act="mis-show"]').click();
  // check block
  const chk = page.locator('.chk').first();
  if (await chk.count()) { await chk.locator('[data-act="hint"]').click(); await chk.locator('.opt').first().click(); ok(`${scheme} check: hint and pick work`); }
  // exam
  await page.evaluate(() => { location.hash = 'exam'; }); await page.waitForTimeout(80);
  await page.locator('[data-act="exam-start"]').click();
  const total = await page.evaluate(() => JSON.parse(document.getElementById('lesson-data').textContent).exam.length);
  for (let i = 0; i < total; i++) { await page.locator('[data-act="exam-pick"]').first().click(); await overflow(`exam q${i + 1}`); await page.locator('[data-act="exam-next"]').click(); }
  const score = await page.locator('.score').textContent();
  ok(`${scheme} exam finished with ${score}`);
  if (scheme === 'dark') { await page.evaluate(h => { location.hash = h; }, secs[0]); await page.waitForTimeout(80); await page.screenshot({ path: `${shots}/dark-section.png` }); }
  errs.length ? bad(`${scheme} page errors: ${errs.join(' | ')}`) : ok(`${scheme} no page errors`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASSED');
process.exit(fails.length ? 1 : 0);
