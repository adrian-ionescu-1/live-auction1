-- ============================================================================
-- Admin roster editing + tighter withdraw window for WoT Blitz teams.
--
--   * admin_wb_save_team — the admin can now edit a team's full roster (name,
--     symbol AND players), not just rename it. Replaces the members wholesale,
--     like the captain's update but without the role/region gates (the admin
--     vouches for the entries).
--   * withdraw_wb_team — also honour the registration_closes_at window, so a
--     team can't be cancelled through the API after sign-ups close (the UI
--     already hides it). Matches update_wb_team's checks.
--
-- Run AFTER 20260624020000. Idempotent / safe to re-run.
-- ============================================================================

-- ── Admin: replace a team's name, symbol and roster ──────────────────────────
create or replace function public.admin_wb_save_team(
  p_team_id uuid,
  p_name text,
  p_symbol text,
  p_members jsonb,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
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
  if not exists (select 1 from public.tournament_teams where id = p_team_id) then
    return json_build_object('success', false, 'error', 'Team not found');
  end if;

  update public.tournament_teams
     set name = v_name, symbol = nullif(p_symbol, ''), updated_at = now()
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
grant execute on function public.admin_wb_save_team(uuid, text, text, jsonb, text)
  to anon, authenticated;

-- ── Captain: withdraw — now also blocked once the sign-up window has closed ──
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
  if v_t.registration_closes_at is not null and now() > v_t.registration_closes_at then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;
  delete from public.tournament_teams where id = p_team_id;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.withdraw_wb_team(uuid) to anon, authenticated;
