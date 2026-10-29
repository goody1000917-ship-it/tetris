// Checks the 國文 subject, the 教學 links and the 會考 source chip on the patched live page.
// usage: node test-chinese.mjs <port>   (a server on that port serving the patched huikao-daily folder)
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
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForTimeout(1500);

// a new record: 國文 is on by default with 3 new questions, dealt right after 自然
const st = await page.evaluate(() => ({ settings: S.settings, ids: (S.days[S.today] || {}).ids || [], order: NEW_ORDER, subjects: SUBJECTS }));
ok(st.settings.chineseNew === 3, 'default chineseNew is 3: ' + JSON.stringify(st.settings));
ok(st.subjects.indexOf('chinese') >= 0 && st.order.join() === 'science,chinese,math,social,english', 'SUBJECTS has chinese and NEW_ORDER is 自然, 國文, 數學, 社會, 英文: ' + st.order.join());
const chiToday = await page.evaluate(ids => ids.filter(function (id) { return S.byId[id] && S.byId[id].subject === 'chinese'; }), st.ids);
ok(chiToday.length === 3, 'today has 3 國文 questions: ' + chiToday.join(','));
const areas = await page.evaluate(ids => ids.map(id => S.byId[id].area), chiToday);
ok(new Set(areas).size >= 2, 'today\'s 國文 questions mix 字音／字形／字義: ' + areas.join(','));
// with 19 reviews due and a budget of 21, the two free slots go to 自然 and 國文
const deal = await page.evaluate(() => {
  var cards = {}, n = 0, sub = function (id) { return S.byId[id].subject; };
  S.bank.forEach(function (q) { if (q.subject !== 'science' && q.subject !== 'chinese' && n < 19) { cards[q.id] = Object.assign(newCard(), { seen: 1, box: 1, due: S.today }); n++; } });
  var two = pickDaily(S.bank, cards, Object.assign({}, S.settings, { budget: 21 }), S.today, {});
  return { reviews: two.reviews.length, two: two.fresh.map(sub).sort() };
});
ok(deal.reviews === 19 && deal.two.join() === 'chinese,science', 'two free slots go to 自然 and 國文: ' + JSON.stringify(deal));
// subject bar and 國文 practice
ok(await page.locator('.subj [data-s=chinese]').count() === 1, '國文 is in the subject bar');
await page.locator('.subj [data-s=chinese]').click(); await page.waitForTimeout(200);
const subj = await page.evaluate(() => S.session && S.session.kind === 'subject' && S.session.subject === 'chinese' && S.session.ids.length && S.session.ids.every(function (id) { return S.byId[id].subject === 'chinese'; }) ? S.session.ids.length : 0);
ok(subj > 0, '國文 practice uses 國文 questions only (' + subj + ')');
const card = await page.locator('#view .card.sheet .row').first().innerHTML();
ok(/chip chinese/.test(card) && /字音|字形|字義/.test(card), 'a 國文 question shows its 字音／字形／字義 chip');
// AI twins never rewrite a 國文 question, even with an AI pass on this device
const twin = await page.evaluate(() => {
  var real = window.aiPass; window.aiPass = function () { return 'test-pass'; };
  var chi = S.bank.filter(function (q) { return q.subject === 'chinese'; })[0], other = S.bank.filter(function (q) { return q.subject === 'math' && !q.figure_img; })[0];
  S.cards[chi.id] = Object.assign(newCard(), S.cards[chi.id] || {}, { seen: 1 }); S.cards[other.id] = Object.assign(newCard(), S.cards[other.id] || {}, { seen: 1 });
  var ses = { answered: {} }, r = { chinese: twinWanted(ses, chi.id), math: twinWanted(ses, other.id) };
  window.aiPass = real; return r;
});
ok(twin.chinese === false && twin.math === true, 'AI twins skip 國文 but still work for other subjects: ' + JSON.stringify(twin));
// a past 會考 question shows where it came from
const src = await page.evaluate(() => { var q = S.bank.filter(function (x) { return x.subject === 'chinese' && x.source && /年會考/.test(x.source); })[0]; return q ? q.id : ''; });
if (src) {
  await page.evaluate(id => { S.session = { kind: 'unit', unit: S.byId[id].unit, ids: [id], idx: 0, answered: {}, reviews: {}, order: {}, extra: true }; S.tab = 'today'; render(); }, src);
  await page.waitForTimeout(150);
  ok(/年會考/.test(await page.locator('#view .card.sheet .row').first().innerText()), 'a past 會考 question shows its source chip (' + src + ')');
} else ok(false, 'the bank has a 國文 會考原題 with a source');
// extra questions split over five subjects
const more = await page.evaluate(() => { S.session = null; S.tab = 'today'; render(); var day = S.days[S.today]; var before = day.ids.length; addMore(10); return day.ids.slice(before).filter(function (id) { return S.byId[id].subject === 'chinese'; }).length; });
ok(more >= 1, '再加練 also adds 國文 (' + more + ')');
// 進度: the lessons and 國文 · 字音／字形／字義
await page.evaluate(() => { S.tab = 'progress'; render(); });
await page.waitForTimeout(200);
const prog = await page.locator('#view').innerText();
ok(/國文 · 字音/.test(prog) && /國文 · 字形/.test(prog) && /國文 · 字義/.test(prog), 'progress lists 國文 · 字音／字形／字義');
const links = await page.$$eval('#view .learn a', as => as.map(a => a.getAttribute('href')));
ok(links.join() === 'learn/similar.html,learn/repro.html', '進度 links to both lessons: ' + links.join());
for (const href of links) ok((await page.request.get(`http://127.0.0.1:${port}/${href}`)).status() === 200, href + ' is served');
// settings
await page.evaluate(() => { S.tab = 'settings'; render(); });
await page.waitForTimeout(200);
ok(await page.locator('#chineseNew').count() === 1, 'settings has 國文新題上限');
const total = await page.evaluate(() => Object.keys(NEW_KEY).reduce(function (t, k) { return t + DEFAULT_SETTINGS[NEW_KEY[k]]; }, 0));
let hint = await page.locator('#newHint').innerText();
ok(/國文 3/.test(hint) && hint.indexOf('= ' + total) >= 0, 'hint counts 國文 (total ' + total + '): ' + hint);
await page.fill('#chineseNew', '5'); await page.dispatchEvent('#chineseNew', 'input');
ok(/國文 5/.test(await page.locator('#newHint').innerText()), 'hint updates live');
await page.locator('[data-act=save-settings]').click(); await page.waitForTimeout(150);
ok(await page.evaluate(() => S.settings.chineseNew) === 5, 'chineseNew saved');
ok(/國文形音義 \d+ 題/.test(await page.locator('#view').innerText()), 'bank count shows 國文形音義');
// wrong-answer notebook filter
await page.evaluate(() => { S.tab = 'wrong'; render(); });
await page.waitForTimeout(150);
ok(await page.locator('#view').getByText('國文', { exact: true }).count() >= 1, 'the 錯題本 filter has 國文');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`chinese subject: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
