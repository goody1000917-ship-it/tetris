// Tetris leaderboard API — Cloudflare Worker + D1. Replaces the Supabase backend, which paused itself
// after a week without players. Same rules as sql/2026-09-25-leaderboard-hardening.sql:
//   GET  /top     -> { rows: [{ name, score, level, lines, created_at, updated_at }] }   (top 50)
//   POST /submit  -> { status: 'ok' | 'bad_name' | 'bad_device' | 'bad_score' | 'name_taken' | 'legacy_low'
//                              | 'too_fast' | 'busy' | 'rate_limited' | 'bad_origin' | 'bad_request' }
// Known differences from the Postgres version: a name longer than 12 characters is cut to 12 (the page does
// the same) instead of rejected; everything else — including "match or beat an ownerless row to take it" — is the same.
// The page posts its JSON as text/plain, so browsers skip the CORS preflight (one round trip fewer on phones).

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// ----- name clean-up: must stay identical to index.html (test/worker.test.mjs compares the two) -----
const INVISIBLE=/[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u2069\u3164\uFEFF\uFFA0\u{1D173}-\u{1D17A}\u{E0000}-\u{E0FFF}]/gu;
function cleanStep(s){
  s=s.replace(INVISIBLE,'').normalize('NFKC').replace(INVISIBLE,'');
  return s.replace(/[\u1680\u2028\u2029]/g,' ').replace(/ +/g,' ').replace(/^ | $/g,'');
}
function cleanName(s){
  s=String(s);
  for(let i=0;i<4;i++){ const t=Array.from(cleanStep(s)).slice(0,12).join(''); if(t===s) break; s=t; }
  return s;
}
// ----- end name clean-up -----

const DEVICE_RE = /^[0-9a-f]{32}$/;
const TOP_N = 50;
const CLAIMS_PER_HOUR = 3;       // new names one device may take per hour
const RESUBMIT_MS = 10_000;      // same name, same device: at most one upload per 10 s

/* Every honest game satisfies these: points 100/300/500/800 × level, level = lines/10 + 1.
   A sanity filter, not anti-cheat — a made-up result that follows the rules still passes. */
function scoreOk(score, level, lines) {
  if (![score, level, lines].every(Number.isInteger)) return false;
  if (lines < 0 || lines > 1500 || score < 0) return false;
  const q = Math.floor(lines / 10), r = lines % 10;
  return level === q + 1 && score % 100 === 0 && score >= 100 * lines && score <= 200 * (q + 1) * (5 * q + r);
}

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function submit(db, body) {
  const name = cleanName(typeof body.name === 'string' ? body.name : '');
  if (!name) return 'bad_name';
  const device = typeof body.device === 'string' ? body.device : '';
  if (!DEVICE_RE.test(device)) return 'bad_device';
  const { score, level, lines } = body;
  if (!scoreOk(score, level, lines)) return 'bad_score';

  const hash = await sha256hex(device);          // only the hash is stored
  const now = Date.now(), iso = new Date(now).toISOString();

  /* D1 runs one statement (or one batch) at a time, but a request's separate awaits interleave with other
     requests. So every rule is checked by the same statement that writes — parallel uploads can't all pass. */
  const owner = await db.prepare('SELECT device_hash FROM owners WHERE name = ?').bind(name).first();
  if (owner) {
    if (owner.device_hash !== hash) return 'name_taken';
    const r = await db.prepare('UPDATE owners SET last_submit = ?1 WHERE name = ?2 AND device_hash = ?3 AND last_submit <= ?4')
      .bind(iso, name, hash, new Date(now - RESUBMIT_MS).toISOString()).run();
    if (!r.meta.changes) return 'too_fast';
  } else {
    const since = new Date(now - 3600_000).toISOString();
    // one batch = one transaction: the claim limit and the old-row rule ("beat it to take it") gate the inserts
    const QUOTA = 'SELECT count(*) FROM owners WHERE device_hash = ?6 AND claimed_at > ?7';
    await db.batch([
      db.prepare(`INSERT INTO leaderboard (name, score, level, lines, created_at, updated_at)
                  SELECT ?1, ?2, ?3, ?4, ?5, ?5 WHERE (${QUOTA}) < ?8 ON CONFLICT (name) DO NOTHING`)
        .bind(name, score, level, lines, iso, hash, since, CLAIMS_PER_HOUR),
      db.prepare(`INSERT INTO owners (name, device_hash, claimed_at, last_submit)
                  SELECT ?1, ?6, ?5, ?5 WHERE (${QUOTA}) < ?8
                    AND NOT EXISTS (SELECT 1 FROM leaderboard WHERE name = ?1 AND score > ?2)
                  ON CONFLICT (name) DO NOTHING`)
        .bind(name, score, level, lines, iso, hash, since, CLAIMS_PER_HOUR),
    ]);
    const won = await db.prepare('SELECT device_hash FROM owners WHERE name = ?').bind(name).first();
    if (!won) {                                    // nothing was written: say why
      const { n } = await db.prepare('SELECT count(*) AS n FROM owners WHERE device_hash = ? AND claimed_at > ?').bind(hash, since).first();
      return n >= CLAIMS_PER_HOUR ? 'busy' : 'legacy_low';
    }
    if (won.device_hash !== hash) return 'name_taken';   // another device claimed it a moment earlier
  }
  await db.prepare('UPDATE leaderboard SET score = ?, level = ?, lines = ?, updated_at = ? WHERE name = ? AND score < ?')
    .bind(score, level, lines, iso, name, score).run();
  return 'ok';
}

async function limited(limiter, key) {
  if (!limiter) return false;                    // no binding (local tests)
  try { return !(await limiter.limit({ key })).success; } catch { return false; }
}

/* rate-limit key: IPv4 as is, IPv6 by its /64 (one home or phone usually gets a whole /64 and could rotate inside it) */
function rlKey(ip) {
  if (!ip.includes(':')) return ip;
  const [h, t = ''] = ip.split('::');
  const a = h ? h.split(':') : [], b = t ? t.split(':') : [];
  const full = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b];
  return full.slice(0, 4).map(x => (parseInt(x, 16) || 0).toString(16)).join(':') + '::/64';
}

/* Uploads from a browser must come from the game. (Browsers always send Origin on cross-site POSTs and pages
   can't fake it; this stops other sites from using their visitors to flood us. curl etc. send no Origin.) */
const ORIGIN_OK = /^(https:\/\/goody1000917-ship-it\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const ip = rlKey(req.headers.get('cf-connecting-ip') || 'local');
    try {
      if (pathname === '/top' && req.method === 'GET') {
        if (await limited(env.READ_LIMIT, ip)) return json({ error: 'rate_limited' }, 429);
        const { results } = await env.DB
          .prepare(`SELECT name, score, level, lines, created_at, updated_at FROM leaderboard ORDER BY score DESC, updated_at ASC LIMIT ${TOP_N}`)
          .all();
        return json({ rows: results });
      }
      if (pathname === '/submit' && req.method === 'POST') {
        const origin = req.headers.get('origin');
        if (origin && !ORIGIN_OK.test(origin)) return json({ status: 'bad_origin' }, 403);
        // per IP, plus one board-wide cap so no number of IPs or device codes can burn the free D1 write quota
        if (await limited(env.SUBMIT_LIMIT, ip) || await limited(env.SUBMIT_GLOBAL, 'all')) return json({ status: 'rate_limited' }, 429);
        const text = await req.text();
        if (text.length > 2000) return json({ status: 'bad_request' }, 413);
        let body;
        try { body = JSON.parse(text); } catch { return json({ status: 'bad_request' }, 400); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ status: 'bad_request' }, 400);
        return json({ status: await submit(env.DB, body) });
      }
      if (pathname === '/' || pathname === '/health') return json({ ok: true });
      return json({ error: 'not_found' }, 404);
    } catch (e) {
      console.error('leaderboard error', e && e.stack || e);
      return json({ error: 'server_error' }, 500);
    }
  },
};
