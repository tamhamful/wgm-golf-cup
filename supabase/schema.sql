-- =====================================================================
-- WGM Golf Cup: database setup
--
-- How to run: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole file -> Run. Safe to run again; it won't duplicate data.
--
-- What it creates:
--   admins        emails of people allowed to administer the tournament
--   tournament    one row holding the setup (teams, players, pairings,
--                 settings) as a JSON document
--   match_scores  one row per match: the hole-by-hole results and when
--                 each hole was recorded
--   ticker_notices  messages admins post to the ticker
--
-- Security:
--   * Anyone can READ the tournament and scores (the leaderboard).
--   * Nobody can write to the tables directly. All changes go through the
--     functions below, which check the rules first.
--   * Setup changes, resets and corrections to finished matches need a
--     signed-in admin (checked against the admins table).
--   * Players are identified by the name picked in the app. This stops
--     mistakes but is not proof of identity (agreed trade-off).
-- =====================================================================


-- ---------- Tables ----------

create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

create table if not exists public.tournament (
  id int primary key default 1 check (id = 1),
  setup jsonb not null,
  version int not null default 1,          -- goes up on every setup change
  updated_at timestamptz not null default now()
);

create table if not exists public.match_scores (
  match_id text primary key,
  holes text[] not null default '{}',     -- index 1 = hole 1: HOME / CHALLENGERS / HALVED
  updated_at timestamptz not null default now()
);

-- When each hole was recorded (same order as holes). Set by the database,
-- used for the ticker ("2 min ago").
alter table public.match_scores
  add column if not exists hole_times timestamptz[] not null default '{}';

-- Messages admins post to the ticker.
create table if not exists public.ticker_notices (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) between 1 and 140)
);


-- ---------- Read access (Row Level Security) ----------

alter table public.admins enable row level security;
alter table public.tournament enable row level security;
alter table public.match_scores enable row level security;
alter table public.ticker_notices enable row level security;

revoke all on public.admins, public.tournament, public.match_scores, public.ticker_notices
  from public, anon, authenticated;
grant select on public.tournament, public.match_scores, public.ticker_notices to anon, authenticated;
grant select on public.admins to authenticated;

drop policy if exists "Anyone can read notices" on public.ticker_notices;
create policy "Anyone can read notices" on public.ticker_notices
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can read the tournament" on public.tournament;
create policy "Anyone can read the tournament" on public.tournament
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can read scores" on public.match_scores;
create policy "Anyone can read scores" on public.match_scores
  for select to anon, authenticated using (true);


-- ---------- Helper functions ----------

-- Is the signed-in user an admin?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "Admins can see the admin list" on public.admins;
create policy "Admins can see the admin list" on public.admins
  for select to authenticated using (public.is_admin());

-- Is this player one of the four in the match's group?
create or replace function public.player_in_group(p_setup jsonb, p_match_id text, p_player_id text)
returns boolean language sql immutable as $$
  with target as (
    select m ->> 'groupId' as group_id
    from jsonb_array_elements(p_setup -> 'matches') m
    where m ->> 'id' = p_match_id
  )
  select exists (
    select 1
    from jsonb_array_elements(p_setup -> 'matches') g, target
    where g ->> 'groupId' = target.group_id
      and p_player_id in (g ->> 'homePlayerId', g ->> 'challengerPlayerId')
  );
$$;

-- Match-play progress: holes that count, and whether the match is over.
-- Mirrors computeMatchState in src/lib/scoring.js.
create or replace function public.match_progress(
  p_holes text[], p_holes_per_match int, out played int, out complete boolean)
language plpgsql immutable as $$
declare
  diff int := 0;
  r text;
begin
  played := 0;
  complete := false;
  foreach r in array coalesce(p_holes, '{}') loop
    exit when played >= p_holes_per_match;
    played := played + 1;
    if r = 'HOME' then diff := diff + 1;
    elsif r = 'CHALLENGERS' then diff := diff - 1;
    end if;
    if abs(diff) > p_holes_per_match - played then
      complete := true;
      exit;
    end if;
  end loop;
  if played = p_holes_per_match then complete := true; end if;
end;
$$;


-- ---------- Scoring ----------

-- Records (or corrects) one hole. p_expected_holes is how many holes the
-- app could see; if someone else has changed the match since, the change
-- is refused so nobody overwrites another person's score by accident.
create or replace function public.record_hole(
  p_match_id text, p_hole int, p_result text, p_player_id text, p_expected_holes int)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  hpm int;
  m jsonb;
  cur text[];
  cur_times timestamptz[];
  admin boolean := public.is_admin();
  prog record;
  after_prog record;
  new_holes text[];
  new_times timestamptz[];
begin
  select setup into s from public.tournament where id = 1;
  hpm := coalesce((s ->> 'holesPerMatch')::int, 18);
  select x into m from jsonb_array_elements(s -> 'matches') x where x ->> 'id' = p_match_id;

  if m is null then raise exception 'That match no longer exists.'; end if;
  if not admin and not public.player_in_group(s, p_match_id, p_player_id) then
    raise exception 'Only the players in this group, or an admin, can enter scores for this match.';
  end if;
  if coalesce(m ->> 'homePlayerId', '') = '' or coalesce(m ->> 'challengerPlayerId', '') = '' then
    raise exception 'Both players must be chosen before scores can be entered.';
  end if;
  if p_result not in ('HOME', 'CHALLENGERS', 'HALVED') then
    raise exception 'Choose who won the hole, or halved.';
  end if;

  insert into public.match_scores (match_id) values (p_match_id) on conflict do nothing;
  select holes, hole_times into cur, cur_times
    from public.match_scores where match_id = p_match_id for update;

  if coalesce(array_length(cur, 1), 0) <> p_expected_holes then
    raise exception 'Someone else has just updated this match. The latest scores are now showing, so please check and try again.';
  end if;

  select * into prog from public.match_progress(cur, hpm);

  if p_hole < 1 or p_hole > hpm then raise exception 'That hole number is not valid.'; end if;
  if p_hole > prog.played + 1 then raise exception 'Enter hole % first.', prog.played + 1; end if;
  if p_hole = prog.played + 1 and prog.complete then
    raise exception 'This match is finished. No more holes can be added.';
  end if;
  if p_hole <= prog.played and prog.complete and not admin then
    raise exception 'This match is finished. Only an admin can correct it.';
  end if;

  new_holes := coalesce(cur[1:prog.played], '{}');
  new_times := coalesce(cur_times[1:prog.played], '{}');
  if p_hole <= prog.played then
    -- Correction: change the result but keep when the hole was played.
    new_holes[p_hole] := p_result;
    new_times[p_hole] := coalesce(new_times[p_hole], now());
  else
    new_holes := new_holes || p_result;
    new_times := new_times || now();
  end if;

  -- A correction can end the match sooner: drop holes after the new finish.
  select * into after_prog from public.match_progress(new_holes, hpm);
  new_holes := coalesce(new_holes[1:after_prog.played], '{}');
  new_times := coalesce(new_times[1:after_prog.played], '{}');

  update public.match_scores
    set holes = new_holes, hole_times = new_times, updated_at = now()
    where match_id = p_match_id;
  return new_holes;
end;
$$;

-- Removes the most recent hole.
create or replace function public.undo_last_hole(
  p_match_id text, p_player_id text, p_expected_holes int)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  hpm int;
  cur text[];
  admin boolean := public.is_admin();
  prog record;
  new_holes text[];
begin
  select setup into s from public.tournament where id = 1;
  hpm := coalesce((s ->> 'holesPerMatch')::int, 18);

  if not admin and not public.player_in_group(s, p_match_id, p_player_id) then
    raise exception 'Only the players in this group, or an admin, can enter scores for this match.';
  end if;

  select holes into cur from public.match_scores where match_id = p_match_id for update;
  if coalesce(array_length(cur, 1), 0) <> p_expected_holes then
    raise exception 'Someone else has just updated this match. The latest scores are now showing, so please check and try again.';
  end if;

  select * into prog from public.match_progress(cur, hpm);
  if prog.played = 0 then raise exception 'No holes have been entered yet.'; end if;
  if prog.complete and not admin then
    raise exception 'This match is finished. Only an admin can correct it.';
  end if;

  new_holes := coalesce(cur[1:prog.played - 1], '{}');
  update public.match_scores
    set holes = new_holes,
        hole_times = coalesce(hole_times[1:prog.played - 1], '{}'),
        updated_at = now()
    where match_id = p_match_id;
  return new_holes;
end;
$$;

-- Clears one match. Admins only.
create or replace function public.reset_match(p_match_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can reset a match.'; end if;
  update public.match_scores set holes = '{}', hole_times = '{}', updated_at = now()
    where match_id = p_match_id;
end;
$$;

-- Clears every score and removes the demonstration label. Admins only.
create or replace function public.clear_all_scores()
returns int language plpgsql security definer set search_path = public as $$
declare
  v int;
begin
  if not public.is_admin() then raise exception 'Only an admin can clear the scores.'; end if;
  update public.match_scores set holes = '{}', hole_times = '{}', updated_at = now()
    where holes <> '{}' or hole_times <> '{}';
  delete from public.ticker_notices where id is not null;
  update public.tournament
    set setup = jsonb_set(setup, '{isDemo}', 'false'), version = version + 1, updated_at = now()
    where id = 1
    returning version into v;
  return v;
end;
$$;


-- ---------- Setup (teams, players, pairings, settings) ----------

-- Saves the whole setup. p_expected_version stops two admins overwriting
-- each other's changes without knowing.
create or replace function public.save_setup(p_setup jsonb, p_expected_version int)
returns int language plpgsql security definer set search_path = public as $$
declare
  v int;
begin
  if not public.is_admin() then
    raise exception 'Only a signed-in admin can change the tournament setup.';
  end if;
  update public.tournament
    set setup = p_setup, version = version + 1, updated_at = now()
    where id = 1 and version = p_expected_version
    returning version into v;
  if v is null then
    raise exception 'Someone else changed the setup at the same time. The latest version is now showing, so please make your change again.';
  end if;
  return v;
end;
$$;


-- ---------- Managing admins ----------

create or replace function public.add_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can add admins.'; end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That does not look like an email address.';
  end if;
  insert into public.admins (email) values (lower(trim(p_email))) on conflict do nothing;
end;
$$;

create or replace function public.remove_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can remove admins.'; end if;
  if (select count(*) from public.admins) <= 1 then
    raise exception 'There must always be at least one admin.';
  end if;
  delete from public.admins where email = lower(trim(p_email));
end;
$$;


-- ---------- Ticker notices (admins) ----------

create or replace function public.post_notice(p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can post to the ticker.'; end if;
  if char_length(trim(coalesce(p_message, ''))) not between 1 and 140 then
    raise exception 'Notices must be between 1 and 140 characters.';
  end if;
  insert into public.ticker_notices (message) values (trim(p_message));
end;
$$;

create or replace function public.delete_notice(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can remove notices.'; end if;
  delete from public.ticker_notices where id = p_id;
end;
$$;


-- ---------- Who may call the functions ----------

revoke execute on function
  public.record_hole(text, int, text, text, int),
  public.undo_last_hole(text, text, int),
  public.reset_match(text),
  public.clear_all_scores(),
  public.save_setup(jsonb, int),
  public.add_admin(text),
  public.remove_admin(text),
  public.post_notice(text),
  public.delete_notice(bigint),
  public.is_admin()
  from public, anon, authenticated;

grant execute on function
  public.record_hole(text, int, text, text, int),
  public.undo_last_hole(text, text, int),
  public.is_admin()
  to anon, authenticated;

grant execute on function
  public.reset_match(text),
  public.clear_all_scores(),
  public.save_setup(jsonb, int),
  public.add_admin(text),
  public.remove_admin(text),
  public.post_notice(text),
  public.delete_notice(bigint)
  to authenticated;


-- ---------- Live updates ----------
-- One table at a time, so a table that is already set up doesn't stop the rest.

do $$ begin
  alter publication supabase_realtime add table public.tournament;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.match_scores;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.ticker_notices;
exception when duplicate_object then null;
end $$;


-- ---------- Starting data ----------

-- First admin (more can be added in the app: Admin -> Settings).
insert into public.admins (email) values ('tom_hamilton84@hotmail.com')
on conflict (email) do nothing;

-- Demonstration teams, players, pairings and scores (generated from
-- src/data/demoTournament.js). Clear them in the app with Admin -> Settings
-- -> Clear all scores, and edit players and pairings in the Admin tab.
insert into public.tournament (id, setup) values (1, '{"version":2,"name":"WGM Golf Cup","isDemo":true,"days":[1,2,3],"currentDay":1,"targetPoints":10,"holesPerMatch":18,"teams":{"HOME":{"id":"HOME","name":"Home Team"},"CHALLENGERS":{"id":"CHALLENGERS","name":"Challengers"}},"players":[{"id":"h1","name":"Tom Hamilton","teamId":"HOME"},{"id":"h2","name":"Ian Ross","teamId":"HOME"},{"id":"h3","name":"David Kelly","teamId":"HOME"},{"id":"h4","name":"James Wilson","teamId":"HOME"},{"id":"h5","name":"David Campbell","teamId":"HOME"},{"id":"h6","name":"Mark Stewart","teamId":"HOME"},{"id":"c1","name":"Greig Dyer","teamId":"CHALLENGERS"},{"id":"c2","name":"Ian Mathieson","teamId":"CHALLENGERS"},{"id":"c3","name":"Bobby Brown","teamId":"CHALLENGERS"},{"id":"c4","name":"Steven Clark","teamId":"CHALLENGERS"},{"id":"c5","name":"Gordon Reid","teamId":"CHALLENGERS"},{"id":"c6","name":"Alan Murray","teamId":"CHALLENGERS"}],"groups":[{"id":"d1g1","day":1,"number":1},{"id":"d1g2","day":1,"number":2},{"id":"d1g3","day":1,"number":3},{"id":"d2g1","day":2,"number":1},{"id":"d2g2","day":2,"number":2},{"id":"d2g3","day":2,"number":3},{"id":"d3g1","day":3,"number":1},{"id":"d3g2","day":3,"number":2},{"id":"d3g3","day":3,"number":3}],"matches":[{"id":"m1","number":1,"day":1,"groupId":"d1g1","homePlayerId":"h1","challengerPlayerId":"c1"},{"id":"m2","number":2,"day":1,"groupId":"d1g1","homePlayerId":"h2","challengerPlayerId":"c2"},{"id":"m3","number":3,"day":1,"groupId":"d1g2","homePlayerId":"h3","challengerPlayerId":"c3"},{"id":"m4","number":4,"day":1,"groupId":"d1g2","homePlayerId":"h4","challengerPlayerId":"c4"},{"id":"m5","number":5,"day":1,"groupId":"d1g3","homePlayerId":"h5","challengerPlayerId":"c5"},{"id":"m6","number":6,"day":1,"groupId":"d1g3","homePlayerId":"h6","challengerPlayerId":"c6"},{"id":"m7","number":7,"day":2,"groupId":"d2g1","homePlayerId":"h1","challengerPlayerId":"c2"},{"id":"m8","number":8,"day":2,"groupId":"d2g1","homePlayerId":"h2","challengerPlayerId":"c3"},{"id":"m9","number":9,"day":2,"groupId":"d2g2","homePlayerId":"h3","challengerPlayerId":"c4"},{"id":"m10","number":10,"day":2,"groupId":"d2g2","homePlayerId":"h4","challengerPlayerId":"c5"},{"id":"m11","number":11,"day":2,"groupId":"d2g3","homePlayerId":"h5","challengerPlayerId":"c6"},{"id":"m12","number":12,"day":2,"groupId":"d2g3","homePlayerId":"h6","challengerPlayerId":"c1"},{"id":"m13","number":13,"day":3,"groupId":"d3g1","homePlayerId":"h1","challengerPlayerId":"c3"},{"id":"m14","number":14,"day":3,"groupId":"d3g1","homePlayerId":"h2","challengerPlayerId":"c4"},{"id":"m15","number":15,"day":3,"groupId":"d3g2","homePlayerId":"h3","challengerPlayerId":"c5"},{"id":"m16","number":16,"day":3,"groupId":"d3g2","homePlayerId":"h4","challengerPlayerId":"c6"},{"id":"m17","number":17,"day":3,"groupId":"d3g3","homePlayerId":"h5","challengerPlayerId":"c1"},{"id":"m18","number":18,"day":3,"groupId":"d3g3","homePlayerId":"h6","challengerPlayerId":"c2"}]}'::jsonb)
on conflict (id) do nothing;

insert into public.match_scores (match_id, holes) values
  ('m1', '{HOME,CHALLENGERS,HALVED,HOME,HALVED,HALVED,CHALLENGERS,HOME,HALVED,HOME,CHALLENGERS,HALVED,HALVED,HALVED}'),
  ('m2', '{CHALLENGERS,HALVED,HOME,CHALLENGERS,HALVED,CHALLENGERS,HALVED,HOME,CHALLENGERS,HALVED,HALVED,HALVED}'),
  ('m3', '{HOME,HALVED,CHALLENGERS,HOME,HALVED,HOME,HALVED,CHALLENGERS,HALVED,HOME,HALVED,CHALLENGERS,HALVED,HALVED,HOME,HALVED,HALVED}'),
  ('m4', '{HOME,CHALLENGERS,HALVED,HALVED,CHALLENGERS,HOME,HALVED,HALVED}')
on conflict (match_id) do nothing;

-- Any recorded holes without a time (e.g. the demo scores above) get
-- realistic times: about 12 minutes per hole, ending a few minutes ago.
update public.match_scores
set hole_times = array(
  select now()
         - ((cardinality(holes) - i) * interval '12 minutes')
         - ((abs(hashtext(match_id)) % 15 + 1) * interval '1 minute')
  from generate_series(1, cardinality(holes)) as i
  order by i
)
where cardinality(hole_times) <> cardinality(holes);
