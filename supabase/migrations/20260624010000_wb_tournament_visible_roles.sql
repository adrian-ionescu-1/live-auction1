-- ============================================================================
-- Role targeting for WoT Blitz tournaments.
--
-- Mirrors community_events.visible_roles: an admin picks which member roles can
-- SEE a tournament (and therefore register a team for it). Without this, every
-- published tournament showed to all wotblitz/bidder members with no way to aim
-- it at a specific audience.
--
--   * tournaments.visible_roles text[]  — lowercased role slugs allowed to see
--     it. Existing rows default to {wotblitz,bidder} so nothing changes for them.
--   * admin_create_wb_tournament gains p_visible_roles (normalized, defaulted).
--   * register_wb_team gains a role gate: a caller may register only if ANY of
--     their roles is in the tournament's visible_roles (same rule as events).
--
-- Run AFTER 20260623010000_wotblitz_tournaments.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Column ───────────────────────────────────────────────────────────────────
alter table public.tournaments
  add column if not exists visible_roles text[] not null default '{wotblitz,bidder}';

-- ── Admin: create a WoT Blitz tournament (now with role targeting) ───────────
-- The signature changes (adds p_visible_roles), so drop the old overload first.
drop function if exists public.admin_create_wb_tournament(
  text, text, text, text, timestamptz, timestamptz, timestamptz, text);

create or replace function public.admin_create_wb_tournament(
  p_name text,
  p_team_format text,
  p_region text default null,
  p_description text default null,
  p_starts_at timestamptz default null,
  p_registration_opens_at timestamptz default null,
  p_registration_closes_at timestamptz default null,
  p_visible_roles text[] default null,
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
  v_roles text[];
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

  -- Normalize the role list (lowercased, trimmed, de-duped). Empty -> default.
  select coalesce(array_agg(distinct lower(trim(r))), '{}')
    into v_roles
  from unnest(coalesce(p_visible_roles, '{}')) as r
  where length(trim(r)) > 0;
  if v_roles is null or array_length(v_roles, 1) is null then
    v_roles := '{wotblitz,bidder}';
  end if;

  insert into public.tournaments
    (name, format, status, stage, team_format, region, description,
     starts_at, registration_opens_at, registration_closes_at, visible_roles)
  values
    (v_name, 'wotblitz_bracket', 'draft', 'registration', p_team_format,
     nullif(p_region, ''), nullif(trim(coalesce(p_description, '')), ''),
     p_starts_at, p_registration_opens_at, p_registration_closes_at, v_roles)
  returning id into v_id;

  return json_build_object('success', true, 'tournament_id', v_id);
end;
$$;
grant execute on function public.admin_create_wb_tournament(
  text, text, text, text, timestamptz, timestamptz, timestamptz, text[], text)
  to anon, authenticated;

-- ── Member: register a team (now gated by the tournament's visible_roles) ────
-- Same signature as before, so create or replace is enough. Only the role gate
-- is added (right after the banned check); the rest of the body is unchanged.
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

  -- Role gate: any of the caller's roles must be in the tournament's
  -- visible_roles (same rule as community events). An empty list means open.
  if coalesce(array_length(v_t.visible_roles, 1), 0) > 0
     and not (v_t.visible_roles && coalesce(v_profile.roles, array[lower(v_profile.role)])) then
    return json_build_object('success', false, 'error', 'This tournament is not open to your role.');
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
