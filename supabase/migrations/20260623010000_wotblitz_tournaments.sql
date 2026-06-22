-- ============================================================================
-- WoT Blitz tournaments — a second tournament type (format 'wotblitz_bracket').
--
-- Unlike the FIFA type (sourced from a finished auction), this one is
-- registration-based and has nothing to do with auctions:
--   * Teams REGISTER themselves: a captain (a signed-in member) picks a team
--     name + symbol and validates real Wargaming accounts (starters + reserves
--     per the team format, e.g. 3v3+1).
--   * The admin draws teams into GROUPS (round-robin) seeded by average starter
--     win-rate, then generates a single-elimination KNOCKOUT bracket that
--     AUTO-ADVANCES the winner of each match by score until a champion.
--
-- Reuses the tournaments / tournament_teams / tournament_matches tables from
-- 20260622060000_tournaments.sql by extending them, plus a new members table.
-- Same security model: open `select`, writes via guarded SECURITY DEFINER RPCs
-- (admin via is_admin_request; team registration via the captain's JWT).
--
-- Run AFTER 20260622060000_tournaments.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema extensions ────────────────────────────────────────────────────────
alter table public.tournaments
  add column if not exists team_format text,
  add column if not exists region text,
  add column if not exists description text,
  add column if not exists registration_opens_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  -- wotblitz lifecycle within a published tournament:
  -- 'registration' | 'groups' | 'knockout' | 'done'
  add column if not exists stage text,
  add column if not exists group_count int,
  add column if not exists advance_per_group int;

alter table public.tournament_teams
  add column if not exists symbol text,
  add column if not exists captain_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists locked boolean not null default false,
  add column if not exists group_label text,
  add column if not exists strength numeric;

-- One team per captain per tournament (self-registration).
create unique index if not exists uq_team_captain
  on public.tournament_teams (tournament_id, captain_profile_id)
  where captain_profile_id is not null;

create table if not exists public.tournament_team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.tournament_teams (id) on delete cascade,
  slot        int not null default 0,
  is_reserve  boolean not null default false,
  player_name text not null,
  account_id  bigint,
  region      text,
  winrate     numeric,
  battles     int,
  avg_damage  numeric,
  created_at  timestamptz not null default now()
);
create index if not exists idx_team_members_team on public.tournament_team_members (team_id);

alter table public.tournament_matches
  add column if not exists stage text,
  add column if not exists group_label text,
  add column if not exists bracket_round int,
  add column if not exists bracket_position int,
  add column if not exists next_match_id uuid references public.tournament_matches (id) on delete set null,
  add column if not exists next_slot text,
  add column if not exists winner_team_id uuid references public.tournament_teams (id) on delete set null;

-- Knockout slots are "to be decided" until their feeder matches resolve.
alter table public.tournament_matches alter column home_team_id drop not null;
alter table public.tournament_matches alter column away_team_id drop not null;

-- RLS for the new members table (open read, writes via RPC).
alter table public.tournament_team_members enable row level security;
drop policy if exists tournament_team_members_select_all on public.tournament_team_members;
create policy tournament_team_members_select_all
  on public.tournament_team_members for select using (true);
grant select on public.tournament_team_members to anon, authenticated;

-- ── Format helpers ───────────────────────────────────────────────────────────
create or replace function public.wb_format_starters(p_fmt text)
returns int language sql immutable as $$
  select case p_fmt
    when '1v1' then 1 when '2v2' then 2 when '3v3+1' then 3
    when '5v5+1' then 5 when '7v7+2' then 7 else 1 end;
$$;

create or replace function public.wb_format_reserves(p_fmt text)
returns int language sql immutable as $$
  select case p_fmt
    when '3v3+1' then 1 when '5v5+1' then 1 when '7v7+2' then 2 else 0 end;
$$;

-- ── Admin: create a WoT Blitz tournament ─────────────────────────────────────
create or replace function public.admin_create_wb_tournament(
  p_name text,
  p_team_format text,
  p_region text default null,
  p_description text default null,
  p_starts_at timestamptz default null,
  p_registration_opens_at timestamptz default null,
  p_registration_closes_at timestamptz default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    return json_build_object('success', false, 'error', 'A tournament name is required');
  end if;
  if public.wb_format_starters(p_team_format) is null then
    return json_build_object('success', false, 'error', 'Invalid team format');
  end if;

  insert into public.tournaments
    (name, format, status, stage, team_format, region, description,
     starts_at, registration_opens_at, registration_closes_at)
  values
    (v_name, 'wotblitz_bracket', 'draft', 'registration', p_team_format,
     nullif(p_region, ''), nullif(trim(coalesce(p_description, '')), ''),
     p_starts_at, p_registration_opens_at, p_registration_closes_at)
  returning id into v_id;

  return json_build_object('success', true, 'tournament_id', v_id);
end;
$$;
grant execute on function public.admin_create_wb_tournament(text, text, text, text, timestamptz, timestamptz, timestamptz, text)
  to anon, authenticated;

-- ── Member: register / update / lock / withdraw a team ───────────────────────
-- p_members: jsonb array of
--   { slot, is_reserve, player_name, account_id, region, winrate, battles, avg_damage }
create or replace function public.register_wb_team(
  p_tournament_id uuid,
  p_name text,
  p_symbol text,
  p_members jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_t record;
  v_team_id uuid;
  v_starters int;
  v_reserves int;
  v_have_starters int;
  v_have_reserves int;
  m jsonb;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;
  if coalesce(v_profile.banned, false) then
    return json_build_object('success', false, 'error', 'You are banned.');
  end if;

  select * into v_t from public.tournaments where id = p_tournament_id;
  if v_t is null or v_t.format <> 'wotblitz_bracket' then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;
  if v_t.status = 'draft' then
    return json_build_object('success', false, 'error', 'Registration is not open yet.');
  end if;
  if coalesce(v_t.stage, 'registration') <> 'registration' then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;
  if v_t.registration_opens_at is not null and now() < v_t.registration_opens_at then
    return json_build_object('success', false, 'error', 'Registration has not opened yet.');
  end if;
  if v_t.registration_closes_at is not null and now() > v_t.registration_closes_at then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;

  if exists (select 1 from public.tournament_teams
              where tournament_id = p_tournament_id and captain_profile_id = v_profile.id) then
    return json_build_object('success', false, 'error', 'You already registered a team.');
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    return json_build_object('success', false, 'error', 'A team name is required');
  end if;

  v_starters := public.wb_format_starters(v_t.team_format);
  v_reserves := public.wb_format_reserves(v_t.team_format);
  v_have_starters := (select count(*) from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) e
                       where coalesce((e->>'is_reserve')::boolean, false) = false);
  v_have_reserves := (select count(*) from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) e
                       where coalesce((e->>'is_reserve')::boolean, false) = true);
  if v_have_starters <> v_starters then
    return json_build_object('success', false, 'error',
      format('This format needs exactly %s starter(s).', v_starters));
  end if;
  if v_have_reserves > v_reserves then
    return json_build_object('success', false, 'error',
      format('At most %s reserve(s) allowed.', v_reserves));
  end if;

  -- Region validation: every member must carry a validated account id.
  if v_t.region is not null then
    if exists (select 1 from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) e
                where nullif(e->>'account_id', '') is null) then
      return json_build_object('success', false, 'error', 'Validate every player''s account first.');
    end if;
  end if;

  insert into public.tournament_teams
    (tournament_id, captain_profile_id, name, symbol)
  values
    (p_tournament_id, v_profile.id, trim(p_name), nullif(p_symbol, ''))
  returning id into v_team_id;

  for m in select * from jsonb_array_elements(coalesce(p_members, '[]'::jsonb))
  loop
    insert into public.tournament_team_members
      (team_id, slot, is_reserve, player_name, account_id, region, winrate, battles, avg_damage)
    values (
      v_team_id,
      coalesce((m->>'slot')::int, 0),
      coalesce((m->>'is_reserve')::boolean, false),
      coalesce(nullif(trim(m->>'player_name'), ''), 'Player'),
      nullif(m->>'account_id', '')::bigint,
      nullif(m->>'region', ''),
      nullif(m->>'winrate', '')::numeric,
      nullif(m->>'battles', '')::int,
      nullif(m->>'avg_damage', '')::numeric
    );
  end loop;

  return json_build_object('success', true, 'team_id', v_team_id);
end;
$$;
grant execute on function public.register_wb_team(uuid, text, text, jsonb) to anon, authenticated;

-- Captain edits their own team (only while registration is open and not locked).
create or replace function public.update_wb_team(
  p_team_id uuid,
  p_name text,
  p_symbol text,
  p_members jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team record;
  v_t record;
  v_starters int;
  v_reserves int;
  v_have_starters int;
  v_have_reserves int;
  m jsonb;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;
  select * into v_team from public.tournament_teams where id = p_team_id;
  if v_team is null or v_team.captain_profile_id <> auth.uid() then
    return json_build_object('success', false, 'error', 'Not your team.');
  end if;
  if coalesce(v_team.locked, false) then
    return json_build_object('success', false, 'error', 'Team is locked.');
  end if;

  select * into v_t from public.tournaments where id = v_team.tournament_id;
  if coalesce(v_t.stage, 'registration') <> 'registration' then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;
  if v_t.registration_closes_at is not null and now() > v_t.registration_closes_at then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;

  v_starters := public.wb_format_starters(v_t.team_format);
  v_reserves := public.wb_format_reserves(v_t.team_format);
  v_have_starters := (select count(*) from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) e
                       where coalesce((e->>'is_reserve')::boolean, false) = false);
  v_have_reserves := (select count(*) from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) e
                       where coalesce((e->>'is_reserve')::boolean, false) = true);
  if v_have_starters <> v_starters then
    return json_build_object('success', false, 'error',
      format('This format needs exactly %s starter(s).', v_starters));
  end if;
  if v_have_reserves > v_reserves then
    return json_build_object('success', false, 'error',
      format('At most %s reserve(s) allowed.', v_reserves));
  end if;
  if v_t.region is not null then
    if exists (select 1 from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) e
                where nullif(e->>'account_id', '') is null) then
      return json_build_object('success', false, 'error', 'Validate every player''s account first.');
    end if;
  end if;
  if nullif(trim(coalesce(p_name, '')), '') is null then
    return json_build_object('success', false, 'error', 'A team name is required');
  end if;

  update public.tournament_teams
     set name = trim(p_name), symbol = nullif(p_symbol, ''), updated_at = now()
   where id = p_team_id;

  delete from public.tournament_team_members where team_id = p_team_id;
  for m in select * from jsonb_array_elements(coalesce(p_members, '[]'::jsonb))
  loop
    insert into public.tournament_team_members
      (team_id, slot, is_reserve, player_name, account_id, region, winrate, battles, avg_damage)
    values (
      p_team_id,
      coalesce((m->>'slot')::int, 0),
      coalesce((m->>'is_reserve')::boolean, false),
      coalesce(nullif(trim(m->>'player_name'), ''), 'Player'),
      nullif(m->>'account_id', '')::bigint,
      nullif(m->>'region', ''),
      nullif(m->>'winrate', '')::numeric,
      nullif(m->>'battles', '')::int,
      nullif(m->>'avg_damage', '')::numeric
    );
  end loop;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.update_wb_team(uuid, text, text, jsonb) to anon, authenticated;

create or replace function public.lock_wb_team(p_team_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_team record;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;
  select * into v_team from public.tournament_teams where id = p_team_id;
  if v_team is null or v_team.captain_profile_id <> auth.uid() then
    return json_build_object('success', false, 'error', 'Not your team.');
  end if;
  update public.tournament_teams set locked = true, updated_at = now() where id = p_team_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.lock_wb_team(uuid) to anon, authenticated;

create or replace function public.withdraw_wb_team(p_team_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_team record; v_t record;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;
  select * into v_team from public.tournament_teams where id = p_team_id;
  if v_team is null or v_team.captain_profile_id <> auth.uid() then
    return json_build_object('success', false, 'error', 'Not your team.');
  end if;
  select * into v_t from public.tournaments where id = v_team.tournament_id;
  if coalesce(v_t.stage, 'registration') <> 'registration' then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;
  delete from public.tournament_teams where id = p_team_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.withdraw_wb_team(uuid) to anon, authenticated;

-- ── Admin: edit / delete a team ──────────────────────────────────────────────
create or replace function public.admin_wb_update_team(
  p_team_id uuid,
  p_name text,
  p_symbol text default null,
  p_admin_key text default null
)
returns json language plpgsql security definer set search_path = public as $$
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
     set name = v_name, symbol = nullif(p_symbol, ''), updated_at = now()
   where id = p_team_id;
  if not found then
    return json_build_object('success', false, 'error', 'Team not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_wb_update_team(uuid, text, text, text) to anon, authenticated;

-- (admin_delete_team from the base migration already removes a team + cascades.)

-- ── Admin: generate groups (snake-seeded by starter win-rate) ────────────────
create or replace function public.admin_wb_generate_groups(
  p_tournament_id uuid,
  p_group_count int,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_n int;
  v_g int;
  i int;
  v_round int;
  v_pos int;
  v_group int;
  v_label text;
  -- group bucket -> team ids, to build round-robin afterwards
  rec record;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_g := greatest(1, coalesce(p_group_count, 1));

  -- Strength = average win-rate of the starters (fallback to all members).
  update public.tournament_teams t
     set strength = coalesce(
       (select avg(winrate) from public.tournament_team_members
         where team_id = t.id and is_reserve = false and winrate is not null),
       (select avg(winrate) from public.tournament_team_members
         where team_id = t.id and winrate is not null),
       0)
   where t.tournament_id = p_tournament_id;

  -- Clear any previous draw + group matches.
  delete from public.tournament_matches
   where tournament_id = p_tournament_id and stage = 'group';
  update public.tournament_teams
     set group_label = null
   where tournament_id = p_tournament_id;

  select array_agg(id order by strength desc nulls last, name asc) into v_ids
    from public.tournament_teams
   where tournament_id = p_tournament_id and eliminated = false;
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n < 2 then
    return json_build_object('success', false, 'error', 'Need at least two teams.');
  end if;

  -- Snake draw across groups so strong teams spread out.
  for i in 0 .. v_n - 1 loop
    v_round := i / v_g;
    v_pos := i % v_g;
    if v_round % 2 = 0 then v_group := v_pos; else v_group := v_g - 1 - v_pos; end if;
    v_label := chr(65 + v_group);
    update public.tournament_teams set group_label = v_label where id = v_ids[i + 1];
  end loop;

  -- Round-robin matches within each group.
  for v_group in 0 .. v_g - 1 loop
    v_label := chr(65 + v_group);
    insert into public.tournament_matches
      (tournament_id, stage, group_label, home_team_id, away_team_id, status)
    select p_tournament_id, 'group', v_label, a.id, b.id, 'scheduled'
      from public.tournament_teams a
      join public.tournament_teams b
        on a.tournament_id = b.tournament_id and a.group_label = b.group_label and a.id < b.id
     where a.tournament_id = p_tournament_id and a.group_label = v_label;
  end loop;

  update public.tournaments
     set stage = 'groups', group_count = v_g, updated_at = now()
   where id = p_tournament_id;

  return json_build_object('success', true, 'groups', v_g, 'teams', v_n);
end;
$$;
grant execute on function public.admin_wb_generate_groups(uuid, int, text) to anon, authenticated;

-- ── Admin: generate the single-elimination bracket ───────────────────────────
-- Takes the top p_advance_per_group from each group's standings, seeds them
-- strongest→weakest, and builds a standard meet-in-final bracket with byes.
create or replace function public.admin_wb_generate_bracket(
  p_tournament_id uuid,
  p_advance_per_group int,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seeds uuid[];
  v_n int;
  v_size int;
  v_order int[];
  v_new int[];
  s int;
  v_pow int;
  k int;
  v_round int;
  v_round_matches int;
  v_prev uuid[];
  v_cur uuid[];
  v_mid uuid;
  v_a uuid;
  v_b uuid;
  j int;
  v_winner uuid;
  rec record;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;

  -- Qualifiers: rank within each group by points, score diff, score for; the
  -- strength (avg starter WR) breaks final ties so the seed order is total.
  with played as (
    select * from public.tournament_matches
     where tournament_id = p_tournament_id and stage = 'group' and status = 'played'
       and home_team_id is not null and away_team_id is not null
       and home_score is not null and away_score is not null
  ),
  agg as (
    select t.id as team_id, t.group_label, t.strength,
      coalesce(sum(case
        when (m.home_team_id = t.id and m.home_score > m.away_score)
          or (m.away_team_id = t.id and m.away_score > m.home_score) then 3
        when m.home_team_id = t.id or m.away_team_id = t.id then
          (case when m.home_score = m.away_score then 1 else 0 end)
        else 0 end), 0) as points,
      coalesce(sum(case
        when m.home_team_id = t.id then m.home_score - m.away_score
        when m.away_team_id = t.id then m.away_score - m.home_score
        else 0 end), 0) as sd,
      coalesce(sum(case
        when m.home_team_id = t.id then m.home_score
        when m.away_team_id = t.id then m.away_score
        else 0 end), 0) as sf
    from public.tournament_teams t
    left join played m on (m.home_team_id = t.id or m.away_team_id = t.id)
    where t.tournament_id = p_tournament_id and t.group_label is not null
    group by t.id, t.group_label, t.strength
  ),
  ranked as (
    select *, row_number() over (
      partition by group_label order by points desc, sd desc, sf desc, strength desc nulls last
    ) as rnk from agg
  )
  select array_agg(team_id order by rnk asc, points desc, sd desc, sf desc, strength desc nulls last)
    into v_seeds
    from ranked
   where rnk <= greatest(1, coalesce(p_advance_per_group, 1));

  v_n := coalesce(array_length(v_seeds, 1), 0);
  if v_n < 2 then
    return json_build_object('success', false, 'error', 'Not enough qualified teams. Play the group matches first.');
  end if;

  -- Clear any previous knockout matches.
  delete from public.tournament_matches
   where tournament_id = p_tournament_id and stage = 'knockout';
  -- Un-eliminate everyone so a re-generated bracket starts clean.
  update public.tournament_teams set eliminated = false
   where tournament_id = p_tournament_id;

  -- Bracket size = next power of two >= n.
  v_size := 2;
  while v_size < v_n loop v_size := v_size * 2; end loop;

  -- Standard seed slot order (meet-in-final), built by doubling.
  v_order := array[1];
  v_pow := 1;
  while v_pow < v_size loop
    v_pow := v_pow * 2;
    v_new := '{}'::int[];
    foreach s in array v_order loop
      v_new := v_new || s;
      v_new := v_new || (v_pow + 1 - s);
    end loop;
    v_order := v_new;
  end loop;

  -- Create rounds bottom-up; round 1 carries teams, later rounds are empty.
  v_round := 1;
  v_round_matches := v_size / 2;
  v_prev := null;
  while v_round_matches >= 1 loop
    v_cur := '{}'::uuid[];
    for k in 0 .. v_round_matches - 1 loop
      if v_round = 1 then
        -- slot seeds (1-based); seed > n is a bye (null).
        s := v_order[k * 2 + 1];
        v_a := case when s <= v_n then v_seeds[s] else null end;
        s := v_order[k * 2 + 2];
        v_b := case when s <= v_n then v_seeds[s] else null end;
      else
        v_a := null; v_b := null;
      end if;
      insert into public.tournament_matches
        (tournament_id, stage, bracket_round, bracket_position, home_team_id, away_team_id, status)
      values (p_tournament_id, 'knockout', v_round, k, v_a, v_b, 'scheduled')
      returning id into v_mid;
      v_cur := v_cur || v_mid;
    end loop;

    if v_prev is not null then
      for j in 0 .. array_length(v_prev, 1) - 1 loop
        update public.tournament_matches
           set next_match_id = v_cur[(j / 2) + 1],
               next_slot = case when j % 2 = 0 then 'home' else 'away' end
         where id = v_prev[j + 1];
      end loop;
    end if;

    v_prev := v_cur;
    v_round := v_round + 1;
    v_round_matches := v_round_matches / 2;
  end loop;

  -- Resolve round-1 byes: the present team auto-advances.
  for rec in
    select * from public.tournament_matches
     where tournament_id = p_tournament_id and stage = 'knockout' and bracket_round = 1
       and (home_team_id is null) <> (away_team_id is null)
  loop
    v_winner := coalesce(rec.home_team_id, rec.away_team_id);
    update public.tournament_matches
       set winner_team_id = v_winner, status = 'played'
     where id = rec.id;
    if rec.next_match_id is not null then
      if rec.next_slot = 'away' then
        update public.tournament_matches set away_team_id = v_winner where id = rec.next_match_id;
      else
        update public.tournament_matches set home_team_id = v_winner where id = rec.next_match_id;
      end if;
    end if;
  end loop;

  update public.tournaments
     set stage = 'knockout', advance_per_group = greatest(1, coalesce(p_advance_per_group, 1)),
         updated_at = now()
   where id = p_tournament_id;

  return json_build_object('success', true, 'qualified', v_n, 'size', v_size);
end;
$$;
grant execute on function public.admin_wb_generate_bracket(uuid, int, text) to anon, authenticated;

-- ── Admin: set a match score (group or knockout, with auto-advance) ──────────
create or replace function public.admin_wb_set_match_score(
  p_match_id uuid,
  p_home_score int,
  p_away_score int,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m record;
  v_winner uuid;
  v_loser uuid;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  select * into v_m from public.tournament_matches where id = p_match_id;
  if v_m is null then
    return json_build_object('success', false, 'error', 'Match not found');
  end if;
  if p_home_score is null or p_away_score is null then
    return json_build_object('success', false, 'error', 'Both scores are required');
  end if;
  if v_m.home_team_id is null or v_m.away_team_id is null then
    return json_build_object('success', false, 'error', 'Both teams must be decided first');
  end if;
  if v_m.stage = 'knockout' and p_home_score = p_away_score then
    return json_build_object('success', false, 'error', 'Knockout matches cannot end in a draw');
  end if;

  if p_home_score > p_away_score then
    v_winner := v_m.home_team_id; v_loser := v_m.away_team_id;
  elsif p_away_score > p_home_score then
    v_winner := v_m.away_team_id; v_loser := v_m.home_team_id;
  else
    v_winner := null; v_loser := null;  -- group draw
  end if;

  update public.tournament_matches
     set home_score = p_home_score, away_score = p_away_score,
         status = 'played', winner_team_id = v_winner, updated_at = now()
   where id = p_match_id;

  -- Knockout: advance the winner, eliminate the loser.
  if v_m.stage = 'knockout' and v_winner is not null then
    if v_m.next_match_id is not null then
      if v_m.next_slot = 'away' then
        update public.tournament_matches set away_team_id = v_winner where id = v_m.next_match_id;
      else
        update public.tournament_matches set home_team_id = v_winner where id = v_m.next_match_id;
      end if;
    end if;
    update public.tournament_teams set eliminated = true where id = v_loser;
  end if;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_wb_set_match_score(uuid, int, int, text) to anon, authenticated;

-- ── Admin: manual match create / delete (fallback editing) ───────────────────
create or replace function public.admin_wb_create_match(
  p_tournament_id uuid,
  p_stage text,
  p_group_label text,
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_admin_key text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  insert into public.tournament_matches
    (tournament_id, stage, group_label, home_team_id, away_team_id, status)
  values (p_tournament_id, coalesce(nullif(p_stage,''),'group'), nullif(p_group_label,''),
          p_home_team_id, p_away_team_id, 'scheduled')
  returning id into v_id;
  return json_build_object('success', true, 'match_id', v_id);
end;
$$;
grant execute on function public.admin_wb_create_match(uuid, text, text, uuid, uuid, text) to anon, authenticated;

create or replace function public.admin_wb_delete_match(
  p_match_id uuid,
  p_admin_key text default null
)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  delete from public.tournament_matches where id = p_match_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_wb_delete_match(uuid, text) to anon, authenticated;

-- ── Admin: finalize (set podium from the final + close) ──────────────────────
create or replace function public.admin_wb_finalize(
  p_tournament_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final record;
  v_champion uuid;
  v_runner uuid;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;

  -- The final is the highest bracket_round match.
  select * into v_final from public.tournament_matches
   where tournament_id = p_tournament_id and stage = 'knockout'
   order by bracket_round desc, bracket_position asc
   limit 1;

  if v_final is not null and v_final.winner_team_id is not null then
    v_champion := v_final.winner_team_id;
    v_runner := case when v_final.home_team_id = v_champion then v_final.away_team_id
                     else v_final.home_team_id end;
    update public.tournaments
       set champion_team_id = v_champion, runner_up_team_id = v_runner
     where id = p_tournament_id;
  end if;

  update public.tournaments
     set stage = 'done', status = 'finished', finished_at = now(), updated_at = now()
   where id = p_tournament_id;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_wb_finalize(uuid, text) to anon, authenticated;
