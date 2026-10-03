// 會考每日練 — Cloudflare Worker + D1. Serves the page itself (Workers Static Assets from ../huikao-daily, see
// wrangler.jsonc) and keeps one student's practice record (per-question spaced-repetition state, each day's question
// set, settings) so the page shows the same progress on every device. Same shape as leaderboard-worker
// (text/plain JSON POST, no preflight). Static files are answered before this code runs; only API calls reach it.
//
//   POST /api   body: { code, op: 'load' }                        -> { status:'ok', cards:{id:doc}, days:{date:doc}, settings:doc|null }
//   POST /api   body: { code, op: 'card'|'day'|'settings', key, data } -> { status:'ok' }
//   POST /api   body: { code, op: 'reset' }                       -> { status:'ok' }
//   GET  /api/health                                              -> { ok:true }
//   (POST / and GET /health work too, for a copy of the page hosted elsewhere pointing at this worker.)
//   status on failure: 'bad_request' | 'bad_code' | 'bad_key' | 'bad_data' | 'bad_origin' | 'rate_limited' | 'full'
//
// `code` is the sync code the page generates on first use (32 hex characters). Only its sha-256 is stored; whoever
// has the code owns that record, which is the whole access model — the page keeps it in localStorage and shows it
// in 設定 so the student can type it into a second phone.

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const CODE_RE = /^[0-9a-f]{32}$/;
const KEY_RE = { card: /^[A-Z]\d{2}-\d{2}$/, day: /^\d{4}-\d{2}-\d{2}$/, settings: /^settings$/ };
const MAX_BODY = 32_000;        // bytes of request text
const MAX_DOC = 16_000;         // bytes of one serialized document
const MAX_DOCS = 5_000;         // documents per student (471 questions + one row per day is well under this)

/* Writes from a browser must come from the page. Browsers always send Origin on cross-site POSTs and pages can't
   fake it; curl etc. send none. */
const ORIGIN_OK = /^(https:\/\/goody1000917-ship-it\.github\.io|https:\/\/([a-z0-9-]+\.)?happygoody\.net|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function limited(limiter, key) {
  if (!limiter) return false;                    // no binding (local tests)
  try { return !(await limiter.limit({ key })).success; } catch { return false; }
}

/* rate-limit key: IPv4 as is, IPv6 by its /64 */
function rlKey(ip) {
  if (!ip.includes(':')) return ip;
  const [h, t = ''] = ip.split('::');
  const a = h ? h.split(':') : [], b = t ? t.split(':') : [];
  const full = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b];
  return full.slice(0, 4).map(x => (parseInt(x, 16) || 0).toString(16)).join(':') + '::/64';
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

async function handle(env, body) {
  if (!isObj(body)) return { status: 'bad_request' };
  const code = typeof body.code === 'string' ? body.code : '';
  if (!CODE_RE.test(code)) return { status: 'bad_code' };
  const user = await sha256hex(code);
  const db = env.DB;

  if (body.op === 'load') {
    const { results } = await db.prepare('SELECT kind, key, data FROM docs WHERE user_hash = ?').bind(user).all();
    const out = { status: 'ok', cards: {}, days: {}, settings: null };
    for (const r of results) {
      let d; try { d = JSON.parse(r.data); } catch { continue; }
      if (r.kind === 'card') out.cards[r.key] = d;
      else if (r.kind === 'day') out.days[r.key] = d;
      else if (r.kind === 'settings') out.settings = d;
    }
    return out;
  }
  if (body.op === 'reset') {
    await db.prepare('DELETE FROM docs WHERE user_hash = ?').bind(user).run();
    return { status: 'ok' };
  }
  if (body.op === 'card' || body.op === 'day' || body.op === 'settings') {
    const key = body.op === 'settings' ? 'settings' : (typeof body.key === 'string' ? body.key : '');
    if (!KEY_RE[body.op].test(key)) return { status: 'bad_key' };
    if (!isObj(body.data)) return { status: 'bad_data' };
    const data = JSON.stringify(body.data);
    if (data.length > MAX_DOC) return { status: 'bad_data' };
    const now = new Date().toISOString();
    // the count guard and the write are one statement, so parallel writes cannot all slip past the cap
    const r = await db.prepare(`INSERT INTO docs (user_hash, kind, key, data, updated_at)
        SELECT ?1, ?2, ?3, ?4, ?5 WHERE (SELECT count(*) FROM docs WHERE user_hash = ?1) < ?6
        ON CONFLICT (user_hash, kind, key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
      .bind(user, body.op, key, data, now, MAX_DOCS).run();
    if (!r.meta.changes) return { status: 'full' };
    return { status: 'ok' };
  }
  return { status: 'bad_request' };
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const ip = rlKey(req.headers.get('cf-connecting-ip') || 'local');
    try {
      const apiPath = pathname === '/' || pathname === '/api' || pathname === '/api/';
      if (req.method === 'GET') {
        if (apiPath || pathname === '/health' || pathname === '/api/health') return json({ ok: true });
        return json({ error: 'not_found' }, 404);
      }
      if (req.method !== 'POST' || !apiPath) return json({ error: 'not_found' }, 404);
      const origin = req.headers.get('origin');
      if (origin && !ORIGIN_OK.test(origin)) return json({ status: 'bad_origin' }, 403);
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ status: 'bad_request' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ status: 'bad_request' }, 400); }
      const write = isObj(body) && body.op !== 'load';
      if (await limited(env.GLOBAL_LIMIT, 'all') || await limited(write ? env.WRITE_LIMIT : env.READ_LIMIT, ip)) return json({ status: 'rate_limited' }, 429);
      const out = await handle(env, body);
      return json(out, out.status === 'ok' ? 200 : 400);
    } catch (e) {
      console.error('huikao error', e && e.stack || e);
      return json({ error: 'server_error' }, 500);
    }
  },
};
