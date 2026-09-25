// Tests for leaderboard-worker (Cloudflare Worker + D1) in a local workerd via Miniflare.
// Run: cd test && npm install && node worker.test.mjs      (never touches the real Cloudflare)
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import fs from 'fs';
import { fileURLToPath } from 'url';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const U = (...cps) => String.fromCodePoint(...cps);           // build odd characters without raw bytes in this file
const WORKER = process.env.WORKER_SRC || here('../leaderboard-worker/src/index.js');   // WORKER_SRC: test a modified copy
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: fs.readFileSync(WORKER, 'utf8'),   // scriptPath fails to start on Windows
  d1Databases: { DB: 'tetris-test' }, compatibilityDate: '2026-09-18',
}));
const db = await mf.getD1Database('DB');
const run = sql => db.prepare(sql).run();
const all = async (sql, ...a) => (await db.prepare(sql).bind(...a).all()).results;

// schema + old rows (the 6 real ones + a few for the legacy rules)
const mig = fs.readFileSync(here('../leaderboard-worker/migrations/0001_init.sql'), 'utf8')
  .replace(/--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
for (const s of mig) await run(s);
for (const s of mig) await run(s);                             // re-runnable
const legacy = [['Mandy', 30500, 7, 67], ['Kogi', 5800, 3, 28], ['GOODY', 1500, 2, 12], ['IC', 1300, 2, 10], ['Ricky', 1200, 2, 10], ['Goody', 400, 1, 4], ['alice', 5000, 3, 25]];
for (const [n, s, lv, li] of legacy)
  await db.prepare('INSERT INTO leaderboard (name, score, level, lines, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(n, s, lv, li, '2026-06-15T00:00:00.000Z', '2026-06-15T00:00:00.000Z').run();

const call = (path, init) => mf.dispatchFetch('https://tetris-api.happygoody.net' + path, init);
async function submit(name, score, level, lines, device, raw) {
  const r = await call('/submit', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: raw ?? JSON.stringify({ name, score, level, lines, device }) });
  const j = await r.json().catch(() => ({}));
  return j.status ?? ('HTTP' + r.status);
}
const D = c => c.repeat(32);
const A = D('a'), B = D('b'), C = D('c'), E = D('e');
const back = async () => run(`UPDATE owners SET last_submit = '2000-01-01T00:00:00.000Z'`);   // "10 s later"

// ---------- plumbing ----------
let r = await call('/top');
let j = await r.json();
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === '*', 'GET /top 200 with CORS');
ok(j.rows.length === 7 && j.rows[0].name === 'Mandy' && j.rows[6].name === 'Goody', 'top is sorted by score');
ok(j.rows.every(x => !('device_hash' in x)), 'no device hash in public rows');
ok((await call('/submit', { method: 'OPTIONS' })).status === 204, 'OPTIONS preflight 204');
ok((await call('/nope')).status === 404, 'unknown path 404');
ok((await call('/top', { method: 'POST' })).status === 404, 'POST /top 404');
ok(await submit(0, 0, 0, 0, 0, 'not json') === 'bad_request', 'bad JSON');
ok(await submit(0, 0, 0, 0, 0, '[1,2]') === 'bad_request', 'array body');
ok(await submit(0, 0, 0, 0, 0, JSON.stringify({ name: 'x'.repeat(3000) })) === 'bad_request', 'huge body');
ok(await submit(0, 0, 0, 0, 0, 'null') === 'bad_request', 'null body');

// ---------- score sanity ----------
ok(await submit('cheat', 99999999, 1, 0, A) === 'bad_score', 'huge score');
ok(await submit('cheat', 150, 1, 1, A) === 'bad_score', 'not a multiple of 100');
ok(await submit('cheat', 1000, 2, 5, A) === 'bad_score', 'level mismatch');
ok(await submit('cheat', 100, 1, 2, A) === 'bad_score', 'below 100 per line');
ok(await submit('cheat', 1100, 1, 5, A) === 'bad_score', 'above max for 5 lines');
ok(await submit('cheat', -100, 1, 0, A) === 'bad_score', 'negative');
ok(await submit('cheat', 300000, 151, 1501, A) === 'bad_score', 'lines cap');
ok(await submit('cheat', 100, null, 1, A) === 'bad_score', 'null level');
ok(await submit('cheat', '100', 1, 1, A) === 'bad_score', 'string score');
ok(await submit('cheat', 100.5, 1, 1, A) === 'bad_score', 'fractional score');
ok(await submit('cheat', 1e308, 1, 1, A) === 'bad_score', 'float overflow');
ok((await all(`SELECT count(*) AS n FROM leaderboard WHERE name = 'cheat'`))[0].n === 0, 'no cheat row written');
function bound(L) { const q = Math.floor(L / 10), r = L % 10; return 200 * (q + 1) * (5 * q + r); }
let honestBad = 0;
for (let g = 0; g < 20000; g++) {
  let s = 0, L = 0, lv = 1; const n = 1 + (g % 60);
  for (let i = 0; i < n; i++) { const c = 1 + ((g * 7 + i * 13) % 4); s += [0, 100, 300, 500, 800][c] * lv; L += c; lv = Math.floor(L / 10) + 1; }
  if (s % 100 || s < 100 * L || s > bound(L) || lv !== Math.floor(L / 10) + 1) honestBad++;
}
ok(honestBad === 0, 'bound holds for 20k simulated honest games');

// ---------- names / device ----------
ok(await submit('', 100, 1, 1, A) === 'bad_name', 'empty name');
ok(await submit('   ', 100, 1, 1, A) === 'bad_name', 'spaces only');
ok(await submit(U(0x200b, 0x200b), 100, 1, 1, A) === 'bad_name', 'zero-width only');
ok(await submit(123, 100, 1, 1, A) === 'bad_name', 'non-string name');
ok(await submit('ok', 100, 1, 1, 'nothex') === 'bad_device', 'bad device');
ok(await submit('ok', 100, 1, 1, A.toUpperCase()) === 'bad_device', 'upper-case device');
ok(await submit('ok', 100, 1, 1, undefined) === 'bad_device', 'missing device');

// ---------- ownership ----------
ok(await submit('bob', 1000, 1, 5, A) === 'ok', 'A claims bob');
ok(await submit('bob', 500, 1, 5, B) === 'name_taken', 'B cannot use bob');
ok(await submit('bob', 500, 1, 5, A) === 'too_fast', 'A too fast');
await back();
ok(await submit('bob', 500, 1, 5, A) === 'ok', 'A lower score ok');
ok((await all(`SELECT score FROM leaderboard WHERE name = 'bob'`))[0].score === 1000, 'lower score does not overwrite');
await back();
ok(await submit('bob', 2000, 2, 10, A) === 'ok', 'A higher score');
const bob = (await all(`SELECT score, level, lines, created_at, updated_at FROM leaderboard WHERE name = 'bob'`))[0];
ok(bob.score === 2000 && bob.level === 2 && bob.lines === 10 && bob.updated_at >= bob.created_at, 'higher score saved, updated_at moves');
const hashes = await all(`SELECT device_hash FROM owners`);
ok(hashes.every(h => /^[0-9a-f]{64}$/.test(h.device_hash) && h.device_hash !== A), 'only sha-256 hashes stored, never the code');

// ---------- legacy rows ----------
ok(await submit('alice', 3000, 3, 25, B) === 'legacy_low', 'must beat legacy alice');
ok(await submit('alice', 6000, 4, 30, B) === 'ok', 'B beats and claims alice');
ok((await all(`SELECT score FROM leaderboard WHERE name = 'alice'`))[0].score === 6000, 'alice updated');
ok(await submit('alice', 9000, 4, 30, C) === 'name_taken', 'C cannot take alice now');
ok(await submit('GOODY', 1500, 2, 12, E) === 'ok', 'equal score claims a legacy row');
ok((await all(`SELECT score FROM leaderboard WHERE name = 'GOODY'`))[0].score === 1500, 'equal score leaves the row as is');
ok(await submit('Goody', 400, 1, 4, B) === 'ok', 'Goody (different case) is a different name');

// ---------- normalisation ----------
ok(await submit(U(0xff21, 0xff4d, 0xff59), 100, 1, 1, C) === 'ok', 'fullwidth Amy accepted');
ok((await all(`SELECT count(*) AS n FROM leaderboard WHERE name = 'Amy'`))[0].n === 1, 'stored as Amy');
ok(await submit('a' + U(0x200b) + 'b', 100, 1, 1, C) === 'ok', 'zero-width inside');
ok((await all(`SELECT count(*) AS n FROM leaderboard WHERE name = 'ab'`))[0].n === 1, 'stored as ab');

// ---------- claim limit: C has Amy + ab; third ok, fourth busy ----------
ok(await submit('c3', 100, 1, 1, C) === 'ok', 'third claim ok');
ok(await submit('c4', 100, 1, 1, C) === 'busy', 'fourth claim in an hour is busy');
ok((await all(`SELECT count(*) AS n FROM leaderboard WHERE name = 'c4'`))[0].n === 0, 'busy leaves no row');
for (let i = 0; i < 35; i++) await submit('flood' + i, 100, 1, 1, i.toString(16).padStart(2, '0').repeat(16));
ok(await submit('新玩家', 800, 1, 4, D('f')) === 'ok', 'a flood of other devices does not block a new player');

// ---------- lookalikes collide with the real name ----------
const G1 = D('1'), G2 = D('2'), G3 = D('3'), G4 = D('4');
ok(await submit('Tom Lee', 100, 1, 1, G1) === 'ok', 'G1 claims Tom Lee');
ok(await submit('小明明', 100, 1, 1, G1) === 'ok', 'G1 claims 小明明');
ok(await submit('Tom  Lee', 100, 1, 1, G2) === 'name_taken', 'double space');
ok(await submit('小明明' + U(0x3164), 100, 1, 1, G2) === 'name_taken', 'hangul filler');
ok(await submit(U(0x3164), 100, 1, 1, G3) === 'bad_name', 'filler only');
ok(await submit('Tom Lee' + U(0xad), 100, 1, 1, G3) === 'name_taken', 'soft hyphen');
ok(await submit(U(0x2028) + 'Tom Lee' + U(0x1680), 100, 1, 1, G4) === 'name_taken', 'odd spaces');
ok(await submit('Tom Lee' + U(0xe0020), 100, 1, 1, G4) === 'name_taken', 'tag character');

// ---------- two devices claim the same new name at once ----------
const race = await Promise.all([submit('race', 100, 1, 1, D('5')), submit('race', 100, 1, 1, D('6'))]);
ok(race.filter(x => x === 'ok').length === 1 && race.filter(x => x === 'name_taken').length === 1, 'race: exactly one wins ' + race);

// ---------- parallel requests can't slip past the rules (each check is part of the write) ----------
const P = D('7');
const par = await Promise.all(Array.from({ length: 10 }, (_, i) => submit('par' + i, 100, 1, 1, P)));
ok(par.filter(x => x === 'ok').length === 3 && par.filter(x => x === 'busy').length === 7, '10 parallel claims from one device: 3 ok, 7 busy — ' + par);
ok((await all('SELECT count(*) AS n FROM owners WHERE name LIKE ?', 'par%'))[0].n === 3, 'only 3 names owned after the parallel burst');
await back();
const burst = await Promise.all(Array.from({ length: 8 }, () => submit('bob', 2000, 2, 10, A)));
ok(burst.filter(x => x === 'ok').length === 1 && burst.filter(x => x === 'too_fast').length === 7, '8 parallel resubmits: 1 ok, 7 too_fast — ' + burst);

// ---------- same, with real-D1-like latency (every D1 call waits 25 ms, so requests really interleave) ----------
{
  const slowSrc = fs.readFileSync(WORKER, 'utf8').replace('async function submit(db, body) {', `async function submit(db0, body) {
    const nap = () => new Promise(r => setTimeout(r, 25));
    const wrap = st => ({ bind: (...a) => wrap(st.bind(...a)), first: async (...a) => { await nap(); return st.first(...a); },
      run: async () => { await nap(); return st.run(); }, all: async () => { await nap(); return st.all(); }, _st: st });
    const db = { prepare: s => wrap(db0.prepare(s)), batch: async list => { await nap(); return db0.batch(list.map(x => x._st)); } };`);
  ok(slowSrc.includes('const nap ='), 'slow-DB wrapper injected');
  const mf3 = new Miniflare(convertV4MiniflareOptions({ modules: true, script: slowSrc, d1Databases: { DB: 'slow' }, compatibilityDate: '2026-09-18' }));
  const db3 = await mf3.getD1Database('DB'); for (const s of mig) await db3.prepare(s).run();
  const sub3 = (name, score, level, lines, device) => mf3.dispatchFetch('https://x/submit', { method: 'POST', body: JSON.stringify({ name, score, level, lines, device }) }).then(async r => (await r.json()).status);
  const S = D('d');
  const c10 = await Promise.all(Array.from({ length: 10 }, (_, i) => sub3('slow' + i, 100, 1, 1, S)));
  ok(c10.filter(x => x === 'ok').length === 3, 'slow D1: 10 parallel claims still give exactly 3 ok — ' + c10);
  await db3.prepare(`UPDATE owners SET last_submit = '2000-01-01T00:00:00.000Z'`).run();
  const r8 = await Promise.all(Array.from({ length: 8 }, () => sub3('slow0', 200, 1, 1, S)));
  ok(r8.filter(x => x === 'ok').length === 1 && r8.filter(x => x === 'too_fast').length === 7, 'slow D1: 8 parallel resubmits give 1 ok, 7 too_fast — ' + r8);
  await mf3.dispose();
}

// ---------- Origin: the game (or no browser at all) may post; another website may not ----------
const withOrigin = o => call('/submit', { method: 'POST', headers: { 'content-type': 'text/plain', origin: o }, body: JSON.stringify({ name: 'orig', score: 100, level: 1, lines: 1, device: D('8') }) }).then(async r => [r.status, (await r.json()).status]);
ok(JSON.stringify(await withOrigin('https://evil.example')) === '[403,"bad_origin"]', 'foreign origin refused');
ok((await all(`SELECT count(*) AS n FROM leaderboard WHERE name = 'orig'`))[0].n === 0, 'nothing written for a foreign origin');
ok(JSON.stringify(await withOrigin('https://goody1000917-ship-it.github.io')) === '[200,"ok"]', 'the game origin is accepted');
ok(JSON.stringify(await withOrigin('https://goody1000917-ship-it.github.io.evil.example')) === '[403,"bad_origin"]', 'look-alike origin refused');

// ---------- /top reads through the index that matches its ORDER BY ----------
const plan = (await all('EXPLAIN QUERY PLAN SELECT name, score, level, lines, created_at, updated_at FROM leaderboard ORDER BY score DESC, updated_at ASC LIMIT 50')).map(x => x.detail).join(' | ');
ok(/leaderboard_rank_idx/.test(plan) && !/TEMP B-TREE/.test(plan), '/top uses leaderboard_rank_idx with no temp sort: ' + plan);

// ---------- rate limits (separate worker with the real limits from wrangler.jsonc) ----------
{
  const rl = JSON.parse(fs.readFileSync(here('../leaderboard-worker/wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')).ratelimits;
  const lim = n => rl.find(r => r.name === n).simple.limit;
  const mf2 = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: fs.readFileSync(WORKER, 'utf8'), d1Databases: { DB: 'rl' }, compatibilityDate: '2026-09-18',
    ratelimits: Object.fromEntries(rl.map(r => [r.name, { namespace_id: r.namespace_id, simple: r.simple }])),
  }));
  const db2 = await mf2.getD1Database('DB'); for (const s of mig) await db2.prepare(s).run();
  const post = (ip, i) => mf2.dispatchFetch('https://x/submit', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify({ name: 'x', score: 150, level: 1, lines: 1, device: D('9') }) }).then(async r => (await r.json()).status);
  const one = []; for (let i = 0; i <= lim('SUBMIT_LIMIT'); i++) one.push(await post('203.0.113.7', i));
  ok(one.slice(0, -1).every(s => s === 'bad_score') && one.at(-1) === 'rate_limited', `IP limit: request ${one.length} from one IP is rate_limited`);
  const v6 = []; for (let i = 0; i <= lim('SUBMIT_LIMIT'); i++) v6.push(await post('2001:db8:1:2:' + (i + 1).toString(16) + '::1', i));
  ok(v6.at(-1) === 'rate_limited', 'rotating addresses inside one IPv6 /64 share one limit');
  const many = []; for (let i = 0; i < lim('SUBMIT_GLOBAL') + 5; i++) many.push(await post('198.51.100.' + (i % 250), i));
  ok(many.includes('rate_limited'), `board-wide cap stops ${lim('SUBMIT_GLOBAL') + 5} uploads from different IPs`);
  const rd = await mf2.dispatchFetch('https://x/top', { headers: { 'cf-connecting-ip': '192.0.2.1' } });
  ok(rd.status === 200, 'reads are not blocked by the upload caps');
  await mf2.dispose();
}

// ---------- the name clean-up is literally the same code on the page and the server ----------
const block = (t, from, to) => t.slice(t.indexOf(from), t.indexOf(to)).trimEnd();
const page = fs.readFileSync(here('../index.html'), 'utf8');
const worker = fs.readFileSync(WORKER, 'utf8');
const pb = block(page, 'const INVISIBLE=', 'const SUBMIT_MSG=');
const wb = block(worker, 'const INVISIBLE=', '// ----- end name clean-up');
ok(pb.length > 200 && pb === wb, 'name clean-up identical in index.html and the worker');
const cleanName = new Function(wb + '; return cleanName;')();
const pool = ['a', 'B', ' ', '  ', '小', '明', U(0xff21), U(0xff11), U(0xff76), U(0xfb01), U(0x2460), U(0x337f), U(0xe9), 'e' + U(0x301), U(0x301), U(0x200b), U(0x200d),
  U(0xad), U(0x3164), U(0x1160), U(0xfe0f), U(0x2764), U(0x1f469), U(0x1f4bb), U(0x2028), U(0x1680), U(0x3000), U(0xa0), '\t', U(0x85), U(0xe0041), U(0x1d173), U(0xa8), '_'];
let seed = 7, notFixed = 0; const rnd = n => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
for (let i = 0; i < 3000; i++) {
  let s = ''; const len = 1 + rnd(16); for (let k = 0; k < len; k++) s += pool[rnd(pool.length)];
  const c = cleanName(s);
  if (cleanName(c) !== c || Array.from(c).length > 12) notFixed++;
}
ok(notFixed === 0, 'clean-up is stable (what the page sends is exactly what is stored): ' + notFixed);

await mf.dispose();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
