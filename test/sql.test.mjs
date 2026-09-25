import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
// Run: cd test && npm install && node sql.test.mjs   (in-memory Postgres via PGlite; the real Supabase is never touched)
const here = p => new URL(p, import.meta.url);

const MIG = fs.readFileSync(here('../sql/2026-09-25-leaderboard-hardening.sql'), 'utf8');
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('FAIL:', m); } };
const q = async (s, p) => (await db.query(s, p)).rows;
const asAnon = async (s, p) => { await db.exec('set role anon'); try { return { rows: (await db.query(s, p)).rows }; } catch (e) { return { err: e.message }; } finally { await db.exec('reset role'); } };
const submit = async (name, score, level, lines, dev) => {
  const res = await asAnon('select public.submit_score($1,$2,$3,$4,$5) as r', [name, score, level, lines, dev]);
  return res.err ? 'ERR:' + res.err : res.rows[0].r;
};
const D = (c) => c.repeat(32);   // fake 32-hex device ids
const A = D('a'), B = D('b'), C = D('c'), E = D('e');

// ---- "before": roughly what Supabase has today ----
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  create table public.leaderboard (id bigserial primary key, name text, score int, level int, lines int, created_at timestamptz default now());
  alter table public.leaderboard add constraint leaderboard_name_unique unique (name);
  alter table public.leaderboard enable row level security;
  create policy "anon insert" on public.leaderboard for insert to anon with check (true);
  create policy "anon select" on public.leaderboard for select to anon using (true);
  grant all on public.leaderboard to anon, authenticated;
  grant usage on sequence public.leaderboard_id_seq to anon, authenticated;
  create function public.upsert_score(p_name text, p_score int, p_level int, p_lines int) returns void language plpgsql security definer as $$
  begin insert into public.leaderboard(name,score,level,lines) values (p_name,p_score,p_level,p_lines)
    on conflict (name) do update set score=excluded.score where public.leaderboard.score < excluded.score; end $$;
  grant execute on function public.upsert_score to anon;
  create function public.upsert_score(p_name text, p_score bigint, p_level bigint, p_lines bigint) returns void language plpgsql security definer as $$
  begin insert into public.leaderboard(name,score,level,lines) values (p_name,p_score,p_level,p_lines); end $$;
  create function public.upsert_score(p_name varchar, p_score int, p_level int, p_lines int) returns void language plpgsql security definer as $$
  begin insert into public.leaderboard(name,score,level,lines) values (p_name,p_score,p_level,p_lines); end $$;
  insert into public.leaderboard(name,score,level,lines,created_at) values
    ('alice',5000,3,25,'2026-09-01'),('匿名',300,1,3,'2026-09-02'),
    ('Ｂｅｎ',3000,3,25,'2026-09-03'),('Ben',2000,2,15,'2026-09-04'),('小明１',2000,2,15,'2026-09-05'),
    ('Ｃａｔ',1000,1,5,'2026-09-06'),('Cat',4000,3,20,'2026-09-07');
`);
// sanity: before migration anon CAN insert directly (the hole we close)
ok(!(await asAnon(`insert into public.leaderboard(name,score,level,lines) values ('pre',1,1,0)`)).err, 'pre: anon insert works before migration');
await db.exec(`delete from public.leaderboard where name='pre'`);

// ---- run the migration twice (must be re-runnable) ----
await db.exec(MIG);
await db.exec(MIG);

// ---- table access ----
ok(!!(await asAnon(`insert into public.leaderboard(name,score,level,lines) values ('x',100,1,1)`)).err, 'anon direct insert blocked');
ok(!!(await asAnon(`update public.leaderboard set score=999999 where name='alice'`)).err, 'anon update blocked');
ok(!!(await asAnon(`delete from public.leaderboard`)).err, 'anon delete blocked');
const sel = await asAnon(`select name,score from public.leaderboard order by score desc`);
ok(sel.rows && sel.rows.length === 5, 'anon can still read the board: ' + JSON.stringify(sel));
const names = (await q(`select name, score from public.leaderboard order by name`)).map(r => r.name + ':' + r.score).join(' ');
ok(names === 'Ben:3000 Cat:4000 alice:5000 匿名:300 小明1:2000', 'old names cleaned, higher score kept on collisions: ' + names);
ok((await q(`select count(*)::int n from pg_proc where proname='upsert_score'`))[0].n === 0, 'every upsert_score overload dropped');
ok(!!(await asAnon(`select public.upsert_score('z'::text,99999999::bigint,1::bigint,0::bigint)`)).err, 'bigint overload gone');
ok(!!(await asAnon(`select private.lb_clean_name('x')`)).err, 'anon cannot call the private helper');
ok(!!(await asAnon(`select * from public.leaderboard_owner`)).err, 'anon cannot read owner table');
ok(!!(await asAnon(`select public.upsert_score('z',99999999,1,0)`)).err, 'old upsert_score gone');
const pols = await q(`select policyname, cmd from pg_policies where tablename='leaderboard'`);
ok(pols.length === 1 && pols[0].cmd === 'SELECT', 'only a SELECT policy left: ' + JSON.stringify(pols));
const legacy = await q(`select name, updated_at = created_at as same from public.leaderboard order by name`);
ok(legacy.every(r => r.same), 'updated_at backfilled from created_at');

// ---- score sanity ----
ok(await submit('cheat', 99999999, 1, 0, A) === 'bad_score', 'huge score rejected');
ok(await submit('cheat', 150, 1, 1, A) === 'bad_score', 'score not multiple of 100');
ok(await submit('cheat', 1000, 2, 5, A) === 'bad_score', 'level mismatch');
ok(await submit('cheat', 100, 1, 2, A) === 'bad_score', 'score below 100*lines');
ok(await submit('cheat', 1100, 1, 5, A) === 'bad_score', 'score above max for 5 lines (1000)');
ok(await submit('cheat', -100, 1, 0, A) === 'bad_score', 'negative');
ok(await submit('cheat', 300000, 151, 1501, A) === 'bad_score', 'lines cap');
ok(await submit('cheat', 100, null, 1, A) === 'bad_score', 'null level');
// simulate honest games with the page's formula; every one must pass the bound
function bound(L) { const q = Math.floor(L / 10), r = L % 10; return 200 * (q + 1) * (5 * q + r); }
let honestBad = 0;
for (let g = 0; g < 20000; g++) {
  let s = 0, L = 0, lv = 1; const n = 1 + (g % 60);
  for (let i = 0; i < n; i++) { const c = 1 + ((g * 7 + i * 13) % 4); s += [0, 100, 300, 500, 800][c] * lv; L += c; lv = Math.floor(L / 10) + 1; }
  if (s % 100 || s < 100 * L || s > bound(L) || lv !== Math.floor(L / 10) + 1) honestBad++;
}
ok(honestBad === 0, 'bound holds for 20k simulated honest games');

// ---- names ----
ok(await submit('', 100, 1, 1, A) === 'bad_name', 'empty name');
ok(await submit('   ', 100, 1, 1, A) === 'bad_name', 'spaces only');
ok(await submit('\u200b\u200b', 100, 1, 1, A) === 'bad_name', 'zero-width only');
ok(await submit('一二三四五六七八九十一二三', 100, 1, 1, A) === 'bad_name', '13 chars');
ok(await submit('ok', 100, 1, 1, 'nothex') === 'bad_device', 'bad device');

// ---- ownership ----
ok(await submit('bob', 1000, 1, 5, A) === 'ok', 'A claims bob');
ok(await submit('bob', 500, 1, 5, B) === 'name_taken', 'B cannot use bob');
ok(await submit('bob', 500, 1, 5, A) === 'too_fast', 'A too fast');
await db.exec(`update public.leaderboard_owner set last_submit = now() - interval '1 minute'`);
ok(await submit('bob', 500, 1, 5, A) === 'ok', 'A lower score ok');
ok((await q(`select score from public.leaderboard where name='bob'`))[0].score === 1000, 'lower score does not overwrite');
await db.exec(`update public.leaderboard_owner set last_submit = now() - interval '1 minute'`);
ok(await submit('bob', 3000, 2, 10, A) === 'bad_score', '3000 with 10 lines is impossible (max 2000)');
await db.exec(`update public.leaderboard_owner set last_submit = now() - interval '1 minute'`);
ok(await submit('bob', 2000, 2, 10, A) === 'ok', 'A higher score');
ok((await q(`select score, level, lines from public.leaderboard where name='bob'`))[0].score === 2000, 'higher score saved');

// ---- legacy rows (no owner yet) ----
ok(await submit('alice', 3000, 3, 25, B) === 'legacy_low', 'must beat legacy alice');
ok(await submit('alice', 6000, 4, 30, B) === 'ok', 'B beats and claims alice');
ok((await q(`select score from public.leaderboard where name='alice'`))[0].score === 6000, 'alice updated');
ok(await submit('alice', 9000, 4, 30, C) === 'name_taken', 'C cannot take alice now');

// ---- old full-width name is reachable again ----
ok(await submit('小明１', 2800, 2, 12, E) === 'ok', 'full-width 小明１ updates the cleaned old row');
ok((await q(`select score from public.leaderboard where name='小明1'`))[0].score === 2800, '小明1 now 2800, no second row');
ok((await q(`select count(*)::int n from public.leaderboard where name like '小明%'`))[0].n === 1, 'still one 小明 row');

// ---- normalisation ----
ok(await submit('Ａｍｙ', 100, 1, 1, C) === 'ok', 'fullwidth name accepted');
ok((await q(`select count(*)::int n from public.leaderboard where name='Amy'`))[0].n === 1, 'stored as Amy (NFKC)');
ok(await submit('a\u200bb', 100, 1, 1, C) === 'ok', 'zero-width inside');
ok((await q(`select count(*)::int n from public.leaderboard where name='ab'`))[0].n === 1, 'stored as ab');

// ---- claim rate limit: C already claimed Amy + ab; third ok, fourth busy ----
ok(await submit('c3', 100, 1, 1, C) === 'ok', 'third claim ok');
ok(await submit('c4', 100, 1, 1, C) === 'busy', 'fourth claim in an hour is busy');
ok((await q(`select count(*)::int n from public.leaderboard where name='c4'`))[0].n === 0, 'busy leaves no row');
ok(await submit('e1', 100, 1, 1, E) === 'ok', 'other device unaffected');
// no board-wide limit any more: one flooder can't block a new player
for (let i = 0; i < 35; i++) await submit('flood' + i, 100, 1, 1, i.toString(16).padStart(2, '0').repeat(16));
ok(await submit('新玩家', 800, 1, 4, D('f')) === 'ok', 'a new player is not blocked by someone flooding names');

// ---- lookalike names now collide with the real one ----
const G1 = D('1'), G2 = D('2'), G3 = D('3'), G4 = D('4');
ok(await submit('Tom Lee', 100, 1, 1, G1) === 'ok', 'G1 claims Tom Lee');
ok(await submit('小明明', 100, 1, 1, G1) === 'ok', 'G1 claims 小明明');
ok(await submit('Tom  Lee', 100, 1, 1, G2) === 'name_taken', 'double space is the same name');
ok(await submit('小明明\u3164', 100, 1, 1, G2) === 'name_taken', 'invisible hangul filler is stripped');
ok(await submit('\u3164', 100, 1, 1, G3) === 'bad_name', 'invisible-only name rejected');
ok(await submit('Tom Lee\u00AD', 100, 1, 1, G3) === 'name_taken', 'soft hyphen stripped');
ok(await submit('\u2028Tom Lee\u1680', 100, 1, 1, G4) === 'name_taken', 'odd spaces trimmed');
ok(await submit('Tom Lee\u{E0020}', 100, 1, 1, G4) === 'name_taken', 'tag character stripped');

// ---- page and server clean names identically ----
const html = fs.readFileSync(here('../index.html'), 'utf8');
const js = html.slice(html.indexOf('const INVISIBLE='), html.indexOf('const SUBMIT_MSG='));
const cleanName = new Function(js + '; return cleanName;')();
const pool = ['a', 'B', 'z', ' ', '  ', '小', '明', 'Ａ', '１', 'ｶ', 'ﬁ', '①', '㍿', 'é', 'e\u0301', '\u0301', '\u200b', '\u200d', '\u00ad', '\u3164', '\u1160',
  '\ufe0f', '❤', '👩', '💻', '🏳', '🌈', '\u2028', '\u1680', '\u3000', '\u00a0', '\t', '\u0085', '\u{E0041}', '\u{1D173}', 'ᄀ', 'ᅡ', '¨', '_', '^'];
let seed = 7; const rnd = n => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
let mismatchClient = 0, notIdem = 0; const bad = [];
for (let i = 0; i < 1500; i++) {
  let s = ''; const len = 1 + rnd(14); for (let k = 0; k < len; k++) s += pool[rnd(pool.length)];
  const c = cleanName(s);
  const srvOfClient = (await q('select private.lb_clean_name($1) v', [c]))[0].v;
  if (srvOfClient !== c) { mismatchClient++; if (bad.length < 3) bad.push(JSON.stringify([s, c, srvOfClient])); }
  const srv = (await q('select private.lb_clean_name($1) v', [s]))[0].v;
  const srv2 = (await q('select private.lb_clean_name($1) v', [srv]))[0].v;
  if (srv2 !== srv) { notIdem++; if (bad.length < 6) bad.push('idem ' + JSON.stringify([s, srv, srv2])); }
}
ok(mismatchClient === 0, `server stores exactly what the page sends (1500 random names): ${mismatchClient} differ ${bad.join(' ')}`);
ok(notIdem === 0, `server clean-up is stable for direct calls: ${notIdem} differ`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
