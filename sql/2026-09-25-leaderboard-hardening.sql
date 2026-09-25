-- Leaderboard hardening (run once in Supabase > SQL Editor; safe to run again).
-- 1) Only submit_score() can write; the public can only read.
-- 2) Impossible scores are rejected. This is a sanity filter, not full anti-cheat:
--    a made-up result that follows the game's scoring rules still gets through.
--    The owner can always remove a row (see the bottom of this file).
-- 3) A name belongs to the device (browser) that claims it; the secret is kept hashed
--    in a table the public cannot read. Old rows nobody owns yet go to the first device
--    that beats their score.

-- ---------- helpers live outside the public API ----------
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- Must match cleanStep()/cleanName() in index.html exactly:
-- strip invisibles -> NFKC -> strip again -> odd spaces to ' ' -> collapse spaces -> trim one space each end.
create or replace function private.lb_clean_name(p text) returns text
language sql set search_path = '' as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 normalize(
                   regexp_replace(coalesce(p, ''),
                     '[\u0001-\u001f\u007f-\u009f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u2069\u3164\ufeff\uffa0\U0001d173-\U0001d17a\U000e0000-\U000e0fff]', '', 'g'),
                   NFKC),
                 '[\u0001-\u001f\u007f-\u009f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u2069\u3164\ufeff\uffa0\U0001d173-\U0001d17a\U000e0000-\U000e0fff]', '', 'g'),
               '[\u1680\u2028\u2029]', ' ', 'g'),
             ' +', ' ', 'g'),
           '^ | $', '', 'g')
$$;
revoke execute on function private.lb_clean_name(text) from public, anon, authenticated;

-- ---------- hidden owner table (no policies + no grants = anon can't see it) ----------
create table if not exists public.leaderboard_owner (
  name        text primary key references public.leaderboard(name) on update cascade on delete cascade,
  device_hash text not null,
  claimed_at  timestamptz not null default now(),
  last_submit timestamptz not null default now()
);
alter table public.leaderboard_owner enable row level security;
revoke all on public.leaderboard_owner from anon, authenticated;
create index if not exists leaderboard_owner_device_idx on public.leaderboard_owner (device_hash, claimed_at);

-- ---------- updated_at (old rows keep their original date) ----------
alter table public.leaderboard add column if not exists updated_at timestamptz;
update public.leaderboard set updated_at = created_at where updated_at is null;
alter table public.leaderboard alter column updated_at set default now();
alter table public.leaderboard alter column updated_at set not null;

-- ---------- old names -> the cleaned form, so their players can still reach them ----------
-- (e.g. full-width 'Ａｍｙ' becomes 'Amy'; if both exist, the higher score is kept)
do $$
declare r record; cur record; v text; other record;
begin
  for r in select id from public.leaderboard loop
    select id, name, score into cur from public.leaderboard where id = r.id;
    if not found then continue; end if;                       -- removed earlier in this loop
    v := private.lb_clean_name(cur.name);
    if v = cur.name or char_length(v) = 0 then continue; end if;
    select id, score into other from public.leaderboard where name = v;
    if found then
      if other.score >= cur.score then
        delete from public.leaderboard where id = cur.id;
        continue;
      end if;
      delete from public.leaderboard where id = other.id;
    end if;
    update public.leaderboard set name = v where id = cur.id;
  end loop;
end $$;

-- ---------- the only write path ----------
create or replace function public.submit_score(p_name text, p_score int, p_level int, p_lines int, p_device text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_name   text;
  v_hash   text;
  v_owner  public.leaderboard_owner%rowtype;
  v_cur    int;
  v_exists boolean;
begin
  v_name := private.lb_clean_name(p_name);
  if char_length(v_name) not between 1 and 12 then return 'bad_name'; end if;
  if p_device is null or p_device !~ '^[0-9a-f]{32}$' then return 'bad_device'; end if;
  v_hash := encode(sha256(convert_to(p_device, 'UTF8')), 'hex');

  -- every honest game satisfies these (pts 100/300/500/800 x level, level = lines/10 + 1)
  if p_score is null or p_level is null or p_lines is null
     or p_lines not between 0 and 1500 or p_score < 0
     or p_level <> p_lines / 10 + 1
     or p_score % 100 <> 0
     or p_score < 100 * p_lines
     or p_score > 200 * (p_lines / 10 + 1) * (5 * (p_lines / 10) + p_lines % 10)
  then return 'bad_score'; end if;

  select * into v_owner from public.leaderboard_owner where name = v_name for update;
  if found then
    if v_owner.device_hash <> v_hash then return 'name_taken'; end if;
    if v_owner.last_submit > now() - interval '10 seconds' then return 'too_fast'; end if;
    update public.leaderboard_owner set last_submit = now() where name = v_name;
  else
    -- claiming a name: one claim at a time, at most 3 new names per device per hour
    perform pg_advisory_xact_lock(hashtext('leaderboard_claim'));
    if (select count(*) from public.leaderboard_owner
         where device_hash = v_hash and claimed_at > now() - interval '1 hour') >= 3 then return 'busy'; end if;

    select score into v_cur from public.leaderboard where name = v_name for update;
    v_exists := found;
    -- an old row nobody owns yet: you have to beat it to take the name (same rule as before)
    if v_exists and p_score < v_cur then return 'legacy_low'; end if;
    if not v_exists then
      insert into public.leaderboard (name, score, level, lines) values (v_name, p_score, p_level, p_lines)
        on conflict (name) do nothing;
    end if;
    insert into public.leaderboard_owner (name, device_hash) values (v_name, v_hash)
      on conflict (name) do nothing;
    select * into v_owner from public.leaderboard_owner where name = v_name;
    if v_owner.device_hash <> v_hash then return 'name_taken'; end if;   -- lost a race
  end if;

  update public.leaderboard
     set score = p_score, level = p_level, lines = p_lines, updated_at = now()
   where name = v_name and score < p_score;
  return 'ok';
end $$;

revoke execute on function public.submit_score(text, int, int, int, text) from public;
grant  execute on function public.submit_score(text, int, int, int, text) to anon, authenticated;

-- ---------- close the old paths ----------
-- every upsert_score, whatever its argument types
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'upsert_score'
  loop
    execute 'drop function ' || f;
  end loop;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'upsert_score') then
    raise exception 'an upsert_score function is still there';
  end if;
end $$;

alter table public.leaderboard enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'leaderboard' and cmd <> 'SELECT'
  loop
    execute format('drop policy %I on public.leaderboard', p.policyname);
  end loop;
  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'leaderboard' and cmd = 'SELECT') then
    create policy "leaderboard public read" on public.leaderboard for select to anon, authenticated using (true);
  end if;
end $$;
revoke insert, update, delete, truncate on public.leaderboard from anon, authenticated;

-- Owner tools (run by hand when needed):
--   free a name so the next device can claim it:  delete from public.leaderboard_owner where name = '小明';
--   give a name to a player's device code:        update public.leaderboard_owner
--                                                    set device_hash = encode(sha256(convert_to('<their 32-char code>','UTF8')),'hex')
--                                                  where name = '小明';
--   remove a row (cheater, rude name):             delete from public.leaderboard where name = '...';
