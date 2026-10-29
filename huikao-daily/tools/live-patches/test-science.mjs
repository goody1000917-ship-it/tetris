// Checks the 自然 subject on the patched live page. usage: node test-science.mjs <port>
import { createRequire } from 'module';
const require = createRequire(import.meta.url);   // run from anywhere; needs Playwright (set PW to its path)
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const port = process.argv[2];
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.|ERR_|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
// an older saved record: settings without scienceNew
await page.addInitScript(() => { if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded', '1'); } });
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForTimeout(1500);
const st = await page.evaluate(() => ({ settings: S.settings, ids: (S.days[S.today] || {}).ids || [] }));
ok(st.settings.scienceNew === 3, 'default scienceNew is 3: ' + JSON.stringify(st.settings));
const sciToday = st.ids.filter(id => /^[BP]\d\d-/.test(id));
ok(sciToday.length === 3, 'today has 3 science questions: ' + sciToday.join(','));
ok(sciToday.some(id => id[0] === 'B') && sciToday.some(id => id[0] === 'P'), 'today mixes 生物 and 理化');
// subject bar
const bar = await page.locator('text=自然').count();
ok(bar > 0, '自然 appears on the page');
// answer through the daily set until a science question shows its chip
let sawChip = false;
for (let i = 0; i < 25 && !sawChip; i++) {
  const html = await page.locator('#view').innerHTML();
  if (/chip science/.test(html)) { sawChip = /生物|理化/.test(html); break; }
  const opt = page.locator('#view .opt').first();
  if (!(await opt.count())) break;
  await opt.click(); await page.waitForTimeout(80);
  const next = page.locator('#view [data-act=next]');
  if (await next.count()) { await next.first().click(); await page.waitForTimeout(80); }
}
ok(sawChip, 'a science question shows its 生物/理化 chip');
// every science stem written with 「｜」 rows renders as a table, and no other stem turns into one
const tables = await page.evaluate(() => {
  var bad = [], n = 0;
  S.bank.filter(function (q) { return q.subject === 'science'; }).forEach(function (q) {
    var hasRows = q.stem.split('\n').filter(function (l) { return l.indexOf('｜') >= 0; }).length >= 2;
    var html = richText(q.stem), isTable = html.indexOf('rt-table') >= 0;
    if (hasRows) n++;
    if (hasRows !== isTable) bad.push(q.id);
  });
  return { n: n, bad: bad };
});
ok(tables.bad.length === 0, 'science tables render (' + tables.n + ' stems with tables); mismatches: ' + tables.bad.join(','));
// subject practice
await page.evaluate(() => { startSubject('science'); });
await page.waitForTimeout(200);
const subj = await page.evaluate(() => S.session && S.session.kind === 'subject' && S.session.ids.every(id => /^[BP]\d\d-/.test(id)) && S.session.ids.length);
ok(subj > 0, 'science subject practice uses science questions only (' + subj + ')');
// new questions are dealt 自然 first: with 19 reviews due and a budget of 20, the one free slot is 自然
const deal = await page.evaluate(() => {
  var cards = {}, n = 0, sub = function (id) { return S.byId[id].subject; };
  S.bank.forEach(function (q) { if (q.subject !== 'science' && n < 19) { cards[q.id] = Object.assign(newCard(), { seen: 1, box: 1, due: S.today }); n++; } });
  var one = pickDaily(S.bank, cards, Object.assign({}, S.settings, { budget: 20 }), S.today, {});
  var three = pickDaily(S.bank, cards, Object.assign({}, S.settings, { budget: 22 }), S.today, {});
  return { reviews: one.reviews.length, one: one.fresh.map(sub), three: three.fresh.map(sub).sort() };
});
ok(deal.reviews === 19 && deal.one.join() === 'science', 'one free slot goes to 自然: ' + JSON.stringify(deal));
const firstThree = await page.evaluate(() => NEW_ORDER.slice(0, 3).sort().join());   // 自然, 數學, 社會 — or 自然, 國文, 數學 once 國文 is added
ok(deal.three.join() === firstThree, 'three free slots follow NEW_ORDER (' + firstThree + '): ' + JSON.stringify(deal.three));
// extra questions split over four subjects
const split = await page.evaluate(() => { var day = S.days[S.today]; var before = day.ids.length; addMore(8); return day.ids.length - before; });
ok(split > 0, 'add-more still adds questions (' + split + ')');
// progress page
await page.evaluate(() => { S.tab = 'progress'; render(); });
await page.waitForTimeout(200);
const prog = await page.locator('#view').innerText();
ok(/自然 · 生物/.test(prog) && /自然 · 理化/.test(prog), 'progress lists 自然 · 生物 and 自然 · 理化');
// settings page
await page.evaluate(() => { S.tab = 'settings'; render(); });
await page.waitForTimeout(200);
ok(await page.locator('#scienceNew').count() === 1, 'settings has 自然新題上限');
const hint = await page.locator('#newHint').innerText();
const total = await page.evaluate(() => Object.keys(NEW_KEY).reduce(function (t, k) { return t + DEFAULT_SETTINGS[NEW_KEY[k]]; }, 0));
ok(/自然 3/.test(hint) && hint.indexOf('= ' + total) >= 0, 'hint counts 自然 (total ' + total + '): ' + hint);
await page.fill('#scienceNew', '5'); await page.dispatchEvent('#scienceNew', 'input');
ok(/自然 5/.test(await page.locator('#newHint').innerText()), 'hint updates live');
await page.locator('[data-act=save-settings]').click(); await page.waitForTimeout(150);
ok(await page.evaluate(() => S.settings.scienceNew) === 5, 'scienceNew saved');
ok(/自然 \d+ 題/.test(await page.locator('#view').innerText()), 'bank count shows 自然');
// wrong-answer notebook filter
await page.evaluate(() => { S.tab = 'wrong'; render(); });
await page.waitForTimeout(150);
ok(await page.locator('#view button.chip:has-text("自然")').count() === 1, 'wrong notebook can filter 自然');
ok(errors.length === 0, 'console errors: ' + errors.join(' | '));
await browser.close();
console.log(`science subject: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
