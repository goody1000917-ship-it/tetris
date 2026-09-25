// One-off: read the old Supabase leaderboard (public read) and write seed.sql (UTF-8, no BOM) + a raw JSON backup.
// Usage: node tools/export-supabase.cjs [seed.sql]   then   npx wrangler d1 execute tetris-leaderboard --remote --file seed.sql
// (The file is written here, not via "> seed.sql": Windows PowerShell would turn a redirect into UTF-16.)
// Old rows get no owner; the first device that matches or beats a row's score claims its name.
const fs = require('fs');
const URL = 'https://uvbvxywapuscfrfcmlaw.supabase.co/rest/v1/leaderboard?select=name,score,level,lines,created_at,updated_at&order=score.desc';
const KEY = 'sb_publishable_6mq88BDCaddDgSymY38Xvw_msebYgTY';   // public read-only key (it was in the page)

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const iso = t => new Date(t).toISOString();                      // same format the Worker writes, so ORDER BY updated_at works

(async () => {
  const r = await fetch(URL, { headers: { apikey: KEY } });
  if (!r.ok) throw new Error('Supabase read failed: HTTP ' + r.status);
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error('no rows read — refusing to write an empty seed');
  const out = ['-- exported ' + new Date().toISOString() + ' from Supabase, ' + rows.length + ' rows'];
  for (const x of rows) {
    if (![x.score, x.level, x.lines].every(Number.isInteger)) throw new Error('bad row ' + JSON.stringify(x));
    out.push(`INSERT INTO leaderboard (name, score, level, lines, created_at, updated_at) VALUES (${q(x.name)}, ${x.score}, ${x.level}, ${x.lines}, ${q(iso(x.created_at))}, ${q(iso(x.updated_at || x.created_at))}) ON CONFLICT (name) DO NOTHING;`);
  }
  const file = process.argv[2] || 'seed.sql';
  fs.writeFileSync(file, out.join('\n') + '\n', 'utf8');
  fs.writeFileSync(file.replace(/\.sql$/, '') + '.supabase.json', JSON.stringify(rows, null, 2), 'utf8');
  console.log(`${file}: ${rows.length} rows — ` + rows.map(x => x.name + ' ' + x.score).join(', '));
})().catch(e => { console.error(e.message); process.exit(1); });
