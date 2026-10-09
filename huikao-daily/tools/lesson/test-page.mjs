// Drives the lesson page on a phone viewport: every view renders, no console errors, no sideways scroll,
// checks / examples / demos / exam all respond. usage: node test-page.mjs <file.html> [shotsDir]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const file = process.argv[2], shots = process.argv[3];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_|net::/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('file://' + file);
  const wide = async (label) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(o <= 0, `${scheme} ${label}: page scrolls sideways by ${o}px`); };
  await wide('home');
  const sections = await page.evaluate(() => Array.from(document.querySelectorAll('.toc a')).map(a => a.getAttribute('href')));
  ok(sections.length >= 2, 'toc lists sections');
  if (shots && scheme === 'light') await page.screenshot({ path: `${shots}/home.png`, fullPage: true });
  for (const h of sections) {
    await page.evaluate(x => { location.hash = x; }, h);
    await page.waitForTimeout(150);
    await wide(h);
    if (h === '#exam') continue;
    const n = await page.locator('.sec .lp, .sec .key, .sec .card, .sec .fig, .sec .trap, .sec details').count();
    ok(n > 0, `${h} renders blocks`);
    // examples: step through
    for (const ex of await page.locator('.ex').all()) {
      let guard = 0;
      while (await ex.locator('[data-act=step]').count() && guard++ < 30) await ex.locator('[data-act=step]').click();
      ok(await ex.locator('.steps li').count() > 0, `${h} example steps reveal`);
    }
    // checks: pick a wrong option first, then hints, then the right one, then next variant
    const checks = await page.locator('.chk').all();
    for (let ci = 0; ci < checks.length; ci++) {
      const id = (await checks[ci].getAttribute('id')).slice(4);
      const ans = await page.evaluate(id => { const S = JSON.parse(document.getElementById('lesson-data').textContent).sections; for (const s of S) for (const b of s.blocks) if (b.id === id) { const st = JSON.parse(localStorage.getItem('similar-lesson-v1') || '{}').checks?.[id] || { v: 0 }; return b.variants[st.v % b.variants.length].answer; } return -1; }, id);
      const box = page.locator('#chk-' + id);
      const wrong = box.locator(`.opt:not([data-i="${ans}"])`).first();
      await wrong.click();
      ok(await box.locator('.fb.bad').count() === 1, `${id} wrong pick shows why`);
      if (await box.locator('[data-act=hint]').count()) { await box.locator('[data-act=hint]').click(); ok(await box.locator('.fb.hint').count() === 1, `${id} hint 1`); }
      await box.locator(`.opt[data-i="${ans}"]`).click();
      ok(await box.locator('.fb.ok').count() === 1, `${id} right pick confirmed`);
      if (await box.locator('[data-act=nextv]').count()) { await box.locator('[data-act=nextv]').click(); ok(await box.locator('.opt.ok,.opt.bad').count() === 0, `${id} next variant is fresh`); }
    }
    // demos
    for (const r of await page.locator('.demo input[type=range]').all()) { await r.fill(String(await r.getAttribute('min'))); await r.fill(String(await r.getAttribute('max'))); }
    for (const b of await page.locator('.demo [data-k]').all()) await b.click();
    for (const b of await page.locator('.demo [data-m]').all()) await b.click();
    ok(await page.locator('.demo').evaluateAll(els => els.every(e => e.querySelector('svg'))), `${h} demos draw`);
    if (shots && scheme === 'light') await page.screenshot({ path: `${shots}/${h.slice(1)}.png`, fullPage: true });
    if (shots && scheme === 'dark' && h === sections[1]) await page.screenshot({ path: `${shots}/${h.slice(1)}-dark.png`, fullPage: true });
  }
  // exam end to end
  await page.evaluate(() => { location.hash = '#exam'; });
  await page.waitForTimeout(100);
  await page.locator('[data-act=exam-start]').click();
  let guard = 0;
  while (await page.locator('[data-act=exam-pick]').count() && guard++ < 40) {
    await page.locator('[data-act=exam-pick]').first().click();
    ok(await page.locator('.fb').count() === 1, 'exam feedback');
    await page.locator('[data-act=exam-next]').click();
  }
  ok(await page.locator('.score').count() === 1, 'exam score shown');
  await wide('exam result');
  if (shots && scheme === 'light') await page.screenshot({ path: `${shots}/exam-result.png`, fullPage: true });
  // progress survives a reload
  const before = await page.locator('#doneN').textContent();
  await page.reload(); await page.waitForTimeout(100);
  ok((await page.locator('#doneN').textContent()) === before, 'progress survives reload');
  ok(errors.length === 0, `${scheme}: console errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log(`lesson page: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
