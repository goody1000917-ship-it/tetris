// Tests for huikao-worker (Cloudflare Worker + D1) in a local workerd via Miniflare.
// Run: cd test && npm install && node huikao-worker.test.mjs      (never touches the real Cloudflare)
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import fs from 'fs';
import { fileURLToPath } from 'url';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const WORKER = process.env.WORKER_SRC || here('../huikao-worker/src/index.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: fs.readFileSync(WORKER, 'utf8'),
  d1Databases: { DB: 'huikao-test' }, compatibilityDate: '2026-09-18',
}));
const db = await mf.getD1Database('DB');
const mig = fs.readFileSync(here('../huikao-worker/migrations/0001_init.sql'), 'utf8')
  .replace(/--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
for (const s of mig) await db.prepare(s).run();
for (const s of mig) await db.prepare(s).run();                 // re-runnable

const API = 'https://huikao.happygoody.net';
const post = async (body, headers = {}) => {
  const r = await mf.dispatchFetch(API + '/', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { http: r.status, ...(await r.json().catch(() => ({}))) };
};
const A = 'a'.repeat(32), B = 'b'.repeat(32);
const card = { box: 1, due: '2026-10-03', seen: 1, correct: 1, wrong: 0, streak: 1, mastered: false, manual: false, last: '2026-10-02' };

// ---------- plumbing ----------
let r = await mf.dispatchFetch(API + '/health');
ok(r.status === 200 && (await r.json()).ok === true && r.headers.get('access-control-allow-origin') === '*', 'GET /health');
ok((await mf.dispatchFetch(API + '/', { method: 'OPTIONS' })).status === 204, 'OPTIONS 204');
ok((await mf.dispatchFetch(API + '/nope')).status === 404, 'unknown GET 404');
ok((await mf.dispatchFetch(API + '/api/health')).status === 200, 'GET /api/health');
{ const r = await mf.dispatchFetch(API + '/api/', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ op: 'load', code: 'a'.repeat(32) }) }); ok(r.status === 200 && (await r.json()).status === 'ok', 'POST /api/ works like POST /'); }
ok((await post('not json')).status === 'bad_request', 'bad JSON');
ok((await post('[1]')).status === 'bad_request', 'array body');
ok((await post({ op: 'load', code: 'short' })).status === 'bad_code', 'bad code');
ok((await post({ op: 'load', code: A.toUpperCase() })).status === 'bad_code', 'uppercase code rejected');
ok((await post({ op: 'nope', code: A })).status === 'bad_request', 'unknown op');
ok((await post(JSON.stringify({ op: 'card', code: A, key: 'M01-01', data: { s: 'x'.repeat(40000) } }))).http === 413, 'huge body 413');
ok((await post({ op: 'load', code: A }, { origin: 'https://evil.example' })).status === 'bad_origin', 'foreign origin rejected');
ok((await post({ op: 'load', code: A }, { origin: 'https://goody1000917-ship-it.github.io' })).status === 'ok', 'github pages origin ok');
ok((await post({ op: 'load', code: A }, { origin: 'https://huikao.happygoody.net' })).status === 'ok', 'own domain origin ok');
ok((await post({ op: 'load', code: A }, { origin: 'http://localhost:8765' })).status === 'ok', 'localhost origin ok');

// ---------- empty record ----------
let j = await post({ op: 'load', code: A });
ok(j.status === 'ok' && Object.keys(j.cards).length === 0 && Object.keys(j.days).length === 0 && j.settings === null, 'empty load');

// ---------- writes ----------
ok((await post({ op: 'card', code: A, key: 'M01-01', data: card })).status === 'ok', 'card write');
ok((await post({ op: 'card', code: A, key: 'M01-01', data: { ...card, box: 2 } })).status === 'ok', 'card overwrite');
ok((await post({ op: 'card', code: A, key: 'bad key', data: card })).status === 'bad_key', 'bad card key');
ok((await post({ op: 'card', code: A, key: 'M01-01', data: [1] })).status === 'bad_data', 'array data');
ok((await post({ op: 'card', code: A, key: 'M01-01', data: 'x' })).status === 'bad_data', 'string data');
ok((await post({ op: 'day', code: A, key: '2026-10-02', data: { ids: ['M01-01'], answered: {} } })).status === 'ok', 'day write');
ok((await post({ op: 'day', code: A, key: '10/02', data: {} })).status === 'bad_key', 'bad day key');
ok((await post({ op: 'settings', code: A, data: { budget: 20 } })).status === 'ok', 'settings write');
ok((await post({ op: 'card', code: A, key: 'M01-02', data: { s: 'x'.repeat(17000) } })).status === 'bad_data', 'oversized doc');

j = await post({ op: 'load', code: A });
ok(j.cards['M01-01'].box === 2 && j.days['2026-10-02'].ids[0] === 'M01-01' && j.settings.budget === 20, 'load returns the latest writes');
ok(Object.keys(j.cards).length === 1, 'rejected writes stored nothing');

// ---------- isolation between codes ----------
j = await post({ op: 'load', code: B });
ok(Object.keys(j.cards).length === 0 && j.settings === null, 'another code sees nothing');
ok((await post({ op: 'card', code: B, key: 'M01-01', data: card })).status === 'ok', 'same key under another code');
j = await post({ op: 'load', code: A });
ok(j.cards['M01-01'].box === 2, "A's card untouched by B's write");

// only hashes are stored
const rows = (await db.prepare('SELECT user_hash FROM docs').all()).results;
ok(rows.every(x => x.user_hash !== A && x.user_hash !== B && /^[0-9a-f]{64}$/.test(x.user_hash)), 'codes are stored hashed');

// ---------- reset ----------
ok((await post({ op: 'reset', code: A })).status === 'ok', 'reset');
j = await post({ op: 'load', code: A });
ok(Object.keys(j.cards).length === 0 && Object.keys(j.days).length === 0 && j.settings === null, 'reset clears A');
j = await post({ op: 'load', code: B });
ok(Object.keys(j.cards).length === 1, 'reset leaves B alone');

// ---------- per-student cap ----------
await db.prepare("UPDATE docs SET user_hash = 'x' WHERE 1 = 0").run();
const stmts = [];
for (let i = 0; i < 5000; i++) stmts.push(db.prepare('INSERT INTO docs (user_hash, kind, key, data, updated_at) VALUES (?, ?, ?, ?, ?)').bind('cap', 'day', '2000-01-' + String(i).padStart(5, '0'), '{}', 'now'));
for (let i = 0; i < stmts.length; i += 500) await db.batch(stmts.slice(i, i + 500));
// the worker hashes the code, so point the rows at the hash of code C
const C = 'c'.repeat(32);
const hashC = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(C)))].map(b => b.toString(16).padStart(2, '0')).join('');
await db.prepare('UPDATE docs SET user_hash = ? WHERE user_hash = ?').bind(hashC, 'cap').run();
ok((await post({ op: 'card', code: C, key: 'M01-01', data: card })).status === 'full', 'new doc past the cap is refused');
ok((await post({ op: 'day', code: C, key: '2000-01-00001', data: { x: 1 } })).status === 'bad_key', 'cap test rows are not reachable by key');

await mf.dispose();
console.log(`huikao-worker: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
