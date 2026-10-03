// End-to-end: the page's self-hosted sync path against the real huikao-worker code in a local Miniflare.
// Run: cd test && npm install && node huikao-e2e.mjs   (needs playwright-core in PW env or ../../scratchpad)
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import fs from 'fs'; import http from 'http'; import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/tmp/claude-0/-home-user-tetris/2c88f28a-0a1f-5296-8085-6f2790d3e8dd/scratchpad/pw/node_modules/playwright-core');
const here = p => fileURLToPath(new URL(p, import.meta.url));
const SITE = process.env.SITE || here('../huikao-daily');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: fs.readFileSync(here('../huikao-worker/src/index.js'), 'utf8'), d1Databases: { DB: 'e2e' }, compatibilityDate: '2026-09-18', port: 8787 }));
await mf.ready;
const db = await mf.getD1Database('DB');
for (const s of fs.readFileSync(here('../huikao-worker/migrations/0001_init.sql'), 'utf8').replace(/--.*$/gm, '').split(';').map(x => x.trim()).filter(Boolean)) await db.prepare(s).run();

// serve the site with the API pointed at the local worker (and the skeleton metas the artifact host adds)
const html = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').replace(/var API_BASE = [^\n]*;/, "var API_BASE = 'http://localhost:8787';");
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(html); }
  const f = path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': u.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); res.end(d); } });
}).listen(8766);

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, isMobile: true });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
const URL_ = 'http://localhost:8766/index.html?sync=1';
await page.goto(URL_, { waitUntil: 'networkidle' }); await page.waitForSelector('.opt');
ok(await page.evaluate(() => S.store.kind) === 'remote', 'remote store selected');
ok(await page.evaluate(() => S.offline) === false, 'online');
const code = await page.evaluate(() => S.syncCode);
ok(/^[0-9a-f]{32}$/.test(code), 'sync code generated');
const firstId = await page.evaluate(() => S.session.ids[0]);
const ans = await page.evaluate(() => S.byId[S.session.ids[0]].answer);
await page.click(`.opt[data-i="${(ans + 1) % 4}"]`); await page.waitForSelector('.why'); await page.click('[data-act=why][data-why=slip]');
await page.waitForTimeout(600);
// D1 has the card and the day
const rows = (await db.prepare('SELECT kind, key, data FROM docs').all()).results;
ok(rows.some(r => r.kind === 'card' && r.key === firstId && JSON.parse(r.data).wrong === 1 && JSON.parse(r.data).why.slip === 1), 'card persisted to D1 with why tag');
ok(rows.some(r => r.kind === 'day' && JSON.parse(r.data).answered[firstId] && JSON.parse(r.data).answered[firstId].ok === false), 'day persisted to D1');
ok(rows.every(r => !r.data.includes(code)), 'code never stored');
// reload: same record, same first question answered
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.opt, .verdict');
ok(await page.evaluate(() => S.session.ids[0]) === firstId && await page.evaluate(() => S.cards[S.session.ids[0]].wrong) === 1, 'reload restores from the worker');
ok(await page.evaluate(() => S.session.idx) === 1, 'resumes at the next unanswered question');
// a second "device" with the same code sees the same record; a fresh device does not
const ctx2 = await browser.newContext({ viewport: { width: 400, height: 860 } }); const p2 = await ctx2.newPage();
await p2.goto(URL_, { waitUntil: 'networkidle' }); await p2.waitForSelector('.opt');
ok(await p2.evaluate(() => Object.keys(S.cards).length) === 0, 'fresh device starts empty with its own code');
await p2.evaluate(c => localStorage.setItem('huikao-sync-code', c), code);
await p2.reload({ waitUntil: 'networkidle' }); await p2.waitForSelector('.opt, .verdict');
ok(await p2.evaluate(() => S.cards[S.session.ids[0]] && S.cards[S.session.ids[0]].wrong) === 1, 'second device with the same code sees the record');
// offline: worker down -> mirrored record, offline notice
await mf.dispose();
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.opt, .verdict');
ok(await page.evaluate(() => S.offline) === true, 'offline flag when the API is unreachable');
ok(await page.evaluate(() => document.querySelector('.notice') !== null), 'offline notice shown');
ok(await page.evaluate(() => S.cards[S.session.ids[0]].wrong) === 1, 'offline open uses the mirrored record');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close(); server.close();
console.log(`huikao-e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
