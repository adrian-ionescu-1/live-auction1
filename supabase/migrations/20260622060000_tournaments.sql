-- ============================================================================
-- Tournaments (FIFA-style blitz) — the post-auction competition.
--
-- After an auction closes, every bidder owns a squad (auction_event_results
-- grouped by user_id). A tournament turns each bidder into a national TEAM:
-- the admin assigns a country, the squad they won becomes the team roster, and
-- the teams play matches that feed an auto-computed standings table.
--
-- First (and currently only) format: 'fifa_blitz' — manual/admin-driven. The
-- admin generates round 1 with a "mix" (shuffle), schedules each round's
-- date/time, enters scores + the top-damage / top-kill player per match, and
-- decides advancement by scheduling the next round. Standings are computed on
-- the client from played matches. When finished the admin sets the podium and
-- moves the tournament to history.
--
-- Design mirrors the existing features:
--   * Open `select` RLS so users can read everything (informative, read-only).
--   * All writes go through SECURITY DEFINER RPCs guarded by is_admin_request()
--     (Discord admin JWT, or the access-key admin via p_admin_key / x-admin-key).
--   * Rosters are SNAPSHOTTED at creation so they survive an auction reset.
--
-- Run AFTER 20260622050000_admin_finish_community_event.sql. Idempotent.
-- ============================================================================

-- ── profiles.default_country: the bidder's default national tag ──────────────
-- Pre-fills a team's country at tournament creation; admin can override per team.
alter table public.profiles
  add column if not exists default_country text;

-- ── Schema ───────────────────────────────────────────────────────────────────
create table if not exists public.tournaments (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  format            text not null default 'fifa_blitz',
  source_event_id   uuid references public.auction_events (id) on delete set null,
  -- 'draft'     = created, hidden from users
  -- 'published' = visible to users (upcoming / current by starts_at + matches)
  -- 'finished'  = closed, kept in history (past)
  status            text not null default 'draft',
  starts_at         timestamptz,
  -- Podium, set on finalize. Plain uuids (no FK) to avoid a tournaments<->teams
  -- circular reference; integrity is handled in the app.
  champion_team_id  uuid,
  runner_up_team_id uuid,
  third_team_id     uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  finished_at       timestamptz
);

create table if not exists public.tournament_teams (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments (id) on delete cascade,
  -- The auction bidder this team came from (null for a manually-added team).
  source_user_id uuid,
  profile_id     uuid references public.profiles (id) on delete set null,
  name           text not null,
  -- ISO 3166-1 alpha-2 country code (lowercase), or null.
  country        text,
  -- Admin marks teams that did not advance; informational (they stop being
  -- scheduled). They stay in the standings table.
  eliminated     boolean not null default false,
  seed           int,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_tournament_teams_tournament on public.tournament_teams (tournament_id);

-- Roster snapshot: the players a bidder won, captured at team creation.
create table if not exists public.tournament_team_players (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.tournament_teams (id) on delete cascade,
  player_name text not null,
  amount      int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_tournament_team_players_team on public.tournament_team_players (team_id);

create table if not exists public.tournament_rounds (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  name          text not null,
  round_order   int not null default 1,
  scheduled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_tournament_rounds_tournament on public.tournament_rounds (tournament_id);

create table if not exists public.tournament_matches (
  id                 uuid primary key default gen_random_uuid(),
  tournament_id      uuid not null references public.tournaments (id) on delete cascade,
  round_id           uuid references public.tournament_rounds (id) on delete set null,
  home_team_id       uuid not null references public.tournament_teams (id) on delete cascade,
  away_team_id       uuid not null references public.tournament_teams (id) on delete cascade,
  scheduled_at       timestamptz,
  home_score         int,
  away_score         int,
  -- 'scheduled' (no result yet) | 'played' (scores entered, counts in standings)
  status             text not null default 'scheduled',
  -- The standout players for the match. Null = "none". team_id ties the tag to a
  -- side so the UI can show its flag.
  top_damage_player  text,
  top_damage_team_id uuid references public.tournament_teams (id) on delete set null,
  top_kill_player    text,
  top_kill_team_id   uuid references public.tournament_teams (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_tournament_matches_tournament on public.tournament_matches (tournament_id);
create index if not exists idx_tournament_matches_round on public.tournament_matches (round_id);

-- ── RLS: open reads, no direct writes (writes go through the RPCs) ────────────
do $$
declare t text;
begin
  foreach t in array array[
    'tournaments', 'tournament_teams', 'tournament_team_players',
    'tournament_rounds', 'tournament_matches'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_select_all', t);
    execute format('create policy %I on public.%I for select using (true);', t || '_select_all', t);
    execute format('grant select on public.%I to anon, authenticated;', t);
  end loop;
end $$;

-- ── Tournament lifecycle RPCs ────────────────────────────────────────────────

-- Create a tournament from a finished auction: snapshot each bidder as a team
-- (country pre-filled from profiles.default_country) plus their won roster.
create or replace function public.admin_create_tournament(
  p_name text,
  p_source_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_name text;
  r record;
  v_team_id uuid;
  v_profile_id uuid;
  v_country text;
  v_seed int := 0;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;

  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    return json_build_object('success', false, 'error', 'A tournament name is required');
  end if;

  insert into public.tournaments (name, source_event_id, status)
  values (v_name, p_source_event_id, 'draft')
  returning id into v_tournament_id;

  -- One team per distinct bidder in the source auction's results.
  if p_source_event_id is not null then
    for r in
      select user_id, max(username) as username
        from public.auction_event_results
       where event_id = p_source_event_id
         and user_id is not null
       group by user_id
       order by max(username)
    loop
      v_seed := v_seed + 1;
      select profile_id into v_profile_id from public.users where id = r.user_id;
      v_country := null;
      if v_profile_id is not null then
        select default_country into v_country from public.profiles where id = v_profile_id;
      end if;

      insert into public.tournament_teams
        (tournament_id, source_user_id, profile_id, name, country, seed)
      values
        (v_tournament_id, r.user_id, v_profile_id, coalesce(r.username, 'Team'), v_country, v_seed)
      returning id into v_team_id;

      insert into public.tournament_team_players (team_id, player_name, amount)
      select v_team_id, player_name, coalesce(amount, 0)
        from public.auction_event_results
       where event_id = p_source_event_id
         and user_id = r.user_id
       order by won_at;
    end loop;
  end if;

  return json_build_object('success', true, 'tournament_id', v_tournament_id);
end;
$$;
grant execute on function public.admin_create_tournament(text, uuid, text) to anon, authenticated;

create or replace function public.admin_update_tournament(
  p_tournament_id uuid,
  p_name text,
  p_starts_at timestamptz default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    return json_build_object('success', false, 'error', 'A tournament name is required');
  end if;
  update public.tournaments
     set name = v_name, starts_at = p_starts_at, updated_at = now()
   where id = p_tournament_id;
  if not found then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_tournament(uuid, text, timestamptz, text) to anon, authenticated;

-- Open the tournament to users (draft -> published).
create or replace function public.admin_publish_tournament(
  p_tournament_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  update public.tournaments
     set status = 'published', finished_at = null, updated_at = now()
   where id = p_tournament_id;
  if not found then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_publish_tournament(uuid, text) to anon, authenticated;

-- Close the tournament and move it to history (-> finished).
create or replace function public.admin_finish_tournament(
  p_tournament_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  update public.tournaments
     set status = 'finished', finished_at = now(), updated_at = now()
   where id = p_tournament_id;
  if not found then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_finish_tournament(uuid, text) to anon, authenticated;

create or replace function public.admin_set_tournament_podium(
  p_tournament_id uuid,
  p_champion_team_id uuid default null,
  p_runner_up_team_id uuid default null,
  p_third_team_id uuid default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  update public.tournaments
     set champion_team_id  = p_champion_team_id,
         runner_up_team_id = p_runner_up_team_id,
         third_team_id     = p_third_team_id,
         updated_at        = now()
   where id = p_tournament_id;
  if not found then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_set_tournament_podium(uuid, uuid, uuid, uuid, text) to anon, authenticated;

create or replace function public.admin_delete_tournament(
  p_tournament_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  delete from public.tournaments where id = p_tournament_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_tournament(uuid, text) to anon, authenticated;

-- ── Team RPCs ────────────────────────────────────────────────────────────────
create or replace function public.admin_add_team(
  p_tournament_id uuid,
  p_name text,
  p_country text default null,
  p_profile_id uuid default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_team_id uuid;
  v_seed int;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    return json_build_object('success', false, 'error', 'A team name is required');
  end if;
  select coalesce(max(seed), 0) + 1 into v_seed
    from public.tournament_teams where tournament_id = p_tournament_id;
  insert into public.tournament_teams (tournament_id, profile_id, name, country, seed)
  values (p_tournament_id, p_profile_id, v_name, nullif(p_country, ''), v_seed)
  returning id into v_team_id;
  return json_build_object('success', true, 'team_id', v_team_id);
end;
$$;
grant execute on function public.admin_add_team(uuid, text, text, uuid, text) to anon, authenticated;

create or replace function public.admin_update_team(
  p_team_id uuid,
  p_name text,
  p_country text default null,
  p_eliminated boolean default false,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    return json_build_object('success', false, 'error', 'A team name is required');
  end if;
  update public.tournament_teams
     set name = v_name,
         country = nullif(p_country, ''),
         eliminated = coalesce(p_eliminated, false),
         updated_at = now()
   where id = p_team_id;
  if not found then
    return json_build_object('success', false, 'error', 'Team not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_team(uuid, text, text, boolean, text) to anon, authenticated;

create or replace function public.admin_delete_team(
  p_team_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  delete from public.tournament_teams where id = p_team_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_team(uuid, text) to anon, authenticated;

-- ── Round RPCs ───────────────────────────────────────────────────────────────
create or replace function public.admin_create_round(
  p_tournament_id uuid,
  p_name text,
  p_scheduled_at timestamptz default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_order int;
  v_round_id uuid;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_name := coalesce(nullif(trim(coalesce(p_name, '')), ''), 'Round');
  select coalesce(max(round_order), 0) + 1 into v_order
    from public.tournament_rounds where tournament_id = p_tournament_id;
  insert into public.tournament_rounds (tournament_id, name, round_order, scheduled_at)
  values (p_tournament_id, v_name, v_order, p_scheduled_at)
  returning id into v_round_id;
  return json_build_object('success', true, 'round_id', v_round_id);
end;
$$;
grant execute on function public.admin_create_round(uuid, text, timestamptz, text) to anon, authenticated;

create or replace function public.admin_update_round(
  p_round_id uuid,
  p_name text,
  p_scheduled_at timestamptz default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_name := coalesce(nullif(trim(coalesce(p_name, '')), ''), 'Round');
  update public.tournament_rounds
     set name = v_name, scheduled_at = p_scheduled_at, updated_at = now()
   where id = p_round_id;
  if not found then
    return json_build_object('success', false, 'error', 'Round not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_round(uuid, text, timestamptz, text) to anon, authenticated;

create or replace function public.admin_delete_round(
  p_round_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  delete from public.tournament_rounds where id = p_round_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_round(uuid, text) to anon, authenticated;

-- ── Match RPCs ───────────────────────────────────────────────────────────────
create or replace function public.admin_create_match(
  p_tournament_id uuid,
  p_round_id uuid,
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_scheduled_at timestamptz default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_match_id uuid;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  if p_home_team_id is null or p_away_team_id is null then
    return json_build_object('success', false, 'error', 'Both teams are required');
  end if;
  if p_home_team_id = p_away_team_id then
    return json_build_object('success', false, 'error', 'A team cannot play itself');
  end if;
  insert into public.tournament_matches
    (tournament_id, round_id, home_team_id, away_team_id, scheduled_at, status)
  values
    (p_tournament_id, p_round_id, p_home_team_id, p_away_team_id, p_scheduled_at, 'scheduled')
  returning id into v_match_id;
  return json_build_object('success', true, 'match_id', v_match_id);
end;
$$;
grant execute on function public.admin_create_match(uuid, uuid, uuid, uuid, timestamptz, text) to anon, authenticated;

-- Full edit of a match: schedule, scores (null = not played yet) and the
-- standout-player tags. Status flips to 'played' once both scores are set.
create or replace function public.admin_update_match(
  p_match_id uuid,
  p_scheduled_at timestamptz default null,
  p_home_score int default null,
  p_away_score int default null,
  p_top_damage_player text default null,
  p_top_damage_team_id uuid default null,
  p_top_kill_player text default null,
  p_top_kill_team_id uuid default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  if p_home_score is not null and p_away_score is not null then
    v_status := 'played';
  else
    v_status := 'scheduled';
  end if;
  update public.tournament_matches
     set scheduled_at       = p_scheduled_at,
         home_score         = p_home_score,
         away_score         = p_away_score,
         status             = v_status,
         top_damage_player  = nullif(trim(coalesce(p_top_damage_player, '')), ''),
         top_damage_team_id = p_top_damage_team_id,
         top_kill_player    = nullif(trim(coalesce(p_top_kill_player, '')), ''),
         top_kill_team_id   = p_top_kill_team_id,
         updated_at         = now()
   where id = p_match_id;
  if not found then
    return json_build_object('success', false, 'error', 'Match not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_match(uuid, timestamptz, int, int, text, uuid, text, uuid, text) to anon, authenticated;

create or replace function public.admin_delete_match(
  p_match_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  delete from public.tournament_matches where id = p_match_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_match(uuid, text) to anon, authenticated;

-- ── Mix: shuffle the non-eliminated teams into round-1 fixtures ───────────────
-- Re-runnable: it recreates "Round 1" and its matches each time. An odd team
-- out gets a bye (no match). Pairs are (1v2),(3v4),… after a random shuffle.
create or replace function public.admin_mix_round(
  p_tournament_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id uuid;
  v_ids uuid[];
  v_count int;
  v_pairs int;
  i int;
  v_made int := 0;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;

  select array_agg(id) into v_ids
    from (
      select id from public.tournament_teams
       where tournament_id = p_tournament_id
         and eliminated = false
       order by random()
    ) s;

  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count < 2 then
    return json_build_object('success', false, 'error', 'Need at least two active teams to mix');
  end if;

  -- Find or (re)create Round 1, then clear its matches.
  select id into v_round_id
    from public.tournament_rounds
   where tournament_id = p_tournament_id and round_order = 1
   limit 1;
  if v_round_id is null then
    insert into public.tournament_rounds (tournament_id, name, round_order)
    values (p_tournament_id, 'Round 1', 1)
    returning id into v_round_id;
  else
    delete from public.tournament_matches where round_id = v_round_id;
  end if;

  v_pairs := v_count / 2;  -- integer division: last team is a bye if odd
  i := 1;
  while i <= v_pairs loop
    insert into public.tournament_matches
      (tournament_id, round_id, home_team_id, away_team_id, status)
    values
      (p_tournament_id, v_round_id, v_ids[i * 2 - 1], v_ids[i * 2], 'scheduled');
    v_made := v_made + 1;
    i := i + 1;
  end loop;

  return json_build_object('success', true, 'matches', v_made, 'round_id', v_round_id);
end;
$$;
grant execute on function public.admin_mix_round(uuid, text) to anon, authenticated;

-- ── Member default country (used from the Members admin page) ─────────────────
create or replace function public.admin_set_member_country(
  p_member_id uuid,
  p_country text default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  update public.profiles
     set default_country = nullif(trim(coalesce(p_country, '')), ''),
         updated_at = now()
   where id = p_member_id;
  if not found then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_set_member_country(uuid, text, text) to anon, authenticated;
