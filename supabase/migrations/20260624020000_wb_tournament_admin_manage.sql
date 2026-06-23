-- ============================================================================
-- Admin management for WoT Blitz tournaments (registration stage).
--
-- The create form only let an admin make + publish a tournament; afterwards the
-- card could draw groups or delete, but not edit the tournament, change the
-- registration window, or add a team by hand. This adds:
--
--   * admin_wb_update_tournament — edit name/description/region/visible_roles +
--     the start & registration window (covers "extend"/"reopen" by setting a new
--     close time, and "stop" by setting it to now()).
--   * admin_wb_set_reg_close     — lightweight helper to set just the
--     registration close time (Close now / Extend / Reopen quick actions).
--   * admin_wb_add_team          — add a team manually (no captain), with an
--     optional validated roster. Locked so it isn't treated as a draft sign-up.
--
-- All guarded by is_admin_request(). Run AFTER 20260624010000. Idempotent.
-- ============================================================================

-- ── Admin: edit a WoT Blitz tournament ───────────────────────────────────────
create or replace function public.admin_wb_update_tournament(
  p_tournament_id uuid,
  p_name text,
  p_description text default null,
  p_region text default null,
  p_visible_roles text[] default null,
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

  -- Normalize the role list (lowercased, trimmed, de-duped). Empty -> default.
  select coalesce(array_agg(distinct lower(trim(r))), '{}')
    into v_roles
  from unnest(coalesce(p_visible_roles, '{}')) as r
  where length(trim(r)) > 0;
  if v_roles is null or array_length(v_roles, 1) is null then
    v_roles := '{wotblitz,bidder}';
  end if;

  update public.tournaments
     set name = v_name,
         description = nullif(trim(coalesce(p_description, '')), ''),
         region = nullif(p_region, ''),
         visible_roles = v_roles,
         starts_at = p_starts_at,
         registration_opens_at = p_registration_opens_at,
         registration_closes_at = p_registration_closes_at,
         updated_at = now()
   where id = p_tournament_id and format = 'wotblitz_bracket';
  if not found then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_wb_update_tournament(
  uuid, text, text, text, text[], timestamptz, timestamptz, timestamptz, text)
  to anon, authenticated;

-- ── Admin: set just the registration close time ──────────────────────────────
-- Close now  -> pass now(); Extend / Reopen -> pass a future time.
create or replace function public.admin_wb_set_reg_close(
  p_tournament_id uuid,
  p_closes_at timestamptz,
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
     set registration_closes_at = p_closes_at, updated_at = now()
   where id = p_tournament_id and format = 'wotblitz_bracket';
  if not found then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_wb_set_reg_close(uuid, timestamptz, text)
  to anon, authenticated;

-- ── Admin: add a team manually ───────────────────────────────────────────────
-- A no-captain team (locked, so it isn't an editable self-sign-up). Members are
-- optional and not region-checked — the admin vouches for them.
create or replace function public.admin_wb_add_team(
  p_tournament_id uuid,
  p_name text,
  p_symbol text default null,
  p_members jsonb default '[]'::jsonb,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t record;
  v_team_id uuid;
  v_name text;
  m jsonb;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    return json_build_object('success', false, 'error', 'A team name is required');
  end if;
  select * into v_t from public.tournaments where id = p_tournament_id;
  if v_t is null or v_t.format <> 'wotblitz_bracket' then
    return json_build_object('success', false, 'error', 'Tournament not found');
  end if;

  insert into public.tournament_teams
    (tournament_id, name, symbol, locked)
  values
    (p_tournament_id, v_name, nullif(p_symbol, ''), true)
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
grant execute on function public.admin_wb_add_team(uuid, text, text, jsonb, text)
  to anon, authenticated;
