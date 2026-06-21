-- ============================================================================
-- Community events (anunțuri) — a separate feature from the named auction events
-- (auction_events / "Auctions" in the UI). A community event is an announcement
-- the admin posts for members of one or more roles. Eligible members see it on
-- their dashboard and can register by filling a set of admin-defined fields.
--
--   * community_events               -> the announcement: type tag, title, body,
--                                       which roles see it, an optional link button,
--                                       informational start/end dates, a registration
--                                       window, and the registration form schema.
--   * community_event_registrations  -> one member's (or a manually-added person's)
--                                       submission: the field values they filled in.
--
-- Admin writes go through SECURITY DEFINER RPCs guarded by is_admin_request (the
-- same access-key / Discord-admin check the auction RPCs use). Members register
-- through register_for_community_event, authorized by their own JWT (auth.uid()).
--
-- Privacy note: unlike the rest of the app (open reads), a registration row is
-- only selectable by the member who created it. Admins read the full lists via
-- the guarded admin_list_community_registrations RPC, so members can't read each
-- other's submitted data.
--
-- Run in the Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
create table if not exists public.community_events (
  id                     uuid primary key default gen_random_uuid(),
  -- Type tag shown as a #hashtag. category_key is a preset slug ('wot_blitz') or
  -- 'custom'; category_name is the human label (the typed name for 'custom').
  category_key           text not null default 'custom',
  category_name          text not null default 'Event',
  title                  text not null,
  content                text not null default '',
  -- Roles allowed to see + register for this event (lowercased role slugs).
  visible_roles          text[] not null default '{}',
  -- Optional link rendered as a clickable button on the event.
  has_link               boolean not null default false,
  link_label             text,
  link_url               text,
  -- Informational only — these never gate anything.
  starts_at              timestamptz,
  ends_at                timestamptz,
  -- Registration window. Outside it, the "Participate" button is closed.
  registration_opens_at  timestamptz,
  registration_closes_at timestamptz,
  -- Registration form schema: jsonb array of
  --   { "key": text, "label": text, "type": "text"|"number", "required": bool }
  registration_fields    jsonb not null default '[]'::jsonb,
  status                 text not null default 'active', -- 'active' | 'archived'
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists public.community_event_registrations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.community_events (id) on delete cascade,
  -- The registering member (null when an admin adds someone manually who has no
  -- account). on delete set null keeps the list entry if the member is removed.
  profile_id   uuid references public.profiles (id) on delete set null,
  -- Name captured at registration time (profile display name, or the typed name
  -- for a manual entry) so the list reads correctly even if the profile changes.
  display_name text not null default 'Participant',
  -- 'self'  -> the member registered themselves.
  -- 'manual'-> the admin added them by hand.
  source       text not null default 'self',
  -- Map of field key -> submitted value.
  values       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One self-registration per member per event (manual entries have no profile_id
-- and are not constrained, so the admin can add as many as needed).
create unique index if not exists community_reg_one_per_member
  on public.community_event_registrations (event_id, profile_id)
  where profile_id is not null;

create index if not exists community_reg_event_idx
  on public.community_event_registrations (event_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Events: open read (they are announcements; the client filters by role and the
-- register RPC enforces the role server-side). Writes only via the RPCs.
alter table public.community_events enable row level security;
drop policy if exists community_events_select_all on public.community_events;
create policy community_events_select_all on public.community_events for select using (true);

-- Registrations: a member may read ONLY their own row (to know they're enrolled).
-- Admins read everyone's via the guarded RPC. No client writes.
alter table public.community_event_registrations enable row level security;
drop policy if exists community_reg_select_own on public.community_event_registrations;
create policy community_reg_select_own on public.community_event_registrations
  for select using (auth.uid() is not null and profile_id = auth.uid());

-- ── admin_create_community_event ─────────────────────────────────────────────
create or replace function public.admin_create_community_event(
  p_category_key text,
  p_category_name text,
  p_title text,
  p_content text,
  p_visible_roles text[],
  p_has_link boolean,
  p_link_label text,
  p_link_url text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_registration_opens_at timestamptz,
  p_registration_closes_at timestamptz,
  p_registration_fields jsonb,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_roles text[];
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    return json_build_object('success', false, 'error', 'Title is required');
  end if;

  -- Normalise roles to lowercase, dropping blanks/dupes.
  select coalesce(array_agg(distinct lower(trim(r))), '{}')
    into v_roles
  from unnest(coalesce(p_visible_roles, '{}')) as r
  where length(trim(r)) > 0;

  insert into public.community_events (
    category_key, category_name, title, content, visible_roles,
    has_link, link_label, link_url,
    starts_at, ends_at, registration_opens_at, registration_closes_at,
    registration_fields, created_by
  ) values (
    coalesce(nullif(trim(p_category_key), ''), 'custom'),
    coalesce(nullif(trim(p_category_name), ''), 'Event'),
    trim(p_title),
    coalesce(p_content, ''),
    v_roles,
    coalesce(p_has_link, false),
    nullif(trim(coalesce(p_link_label, '')), ''),
    nullif(trim(coalesce(p_link_url, '')), ''),
    p_starts_at, p_ends_at, p_registration_opens_at, p_registration_closes_at,
    coalesce(p_registration_fields, '[]'::jsonb),
    auth.uid()
  )
  returning * into v_event;

  return json_build_object('success', true, 'event_id', v_event.id);
end;
$$;
grant execute on function public.admin_create_community_event(
  text, text, text, text, text[], boolean, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz, jsonb, text
) to anon, authenticated;

-- ── admin_update_community_event ─────────────────────────────────────────────
-- Edit the announcement's text + link + roles + informational dates. The
-- registration schema is intentionally NOT editable after creation (existing
-- submissions are keyed to it).
create or replace function public.admin_update_community_event(
  p_event_id uuid,
  p_category_key text,
  p_category_name text,
  p_title text,
  p_content text,
  p_visible_roles text[],
  p_has_link boolean,
  p_link_label text,
  p_link_url text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles text[];
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    return json_build_object('success', false, 'error', 'Title is required');
  end if;

  select coalesce(array_agg(distinct lower(trim(r))), '{}')
    into v_roles
  from unnest(coalesce(p_visible_roles, '{}')) as r
  where length(trim(r)) > 0;

  update public.community_events
     set category_key  = coalesce(nullif(trim(p_category_key), ''), category_key),
         category_name = coalesce(nullif(trim(p_category_name), ''), category_name),
         title         = trim(p_title),
         content       = coalesce(p_content, ''),
         visible_roles = v_roles,
         has_link      = coalesce(p_has_link, false),
         link_label    = nullif(trim(coalesce(p_link_label, '')), ''),
         link_url      = nullif(trim(coalesce(p_link_url, '')), ''),
         starts_at     = p_starts_at,
         ends_at       = p_ends_at,
         updated_at    = now()
   where id = p_event_id;

  if not found then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_community_event(
  uuid, text, text, text, text, text[], boolean, text, text, timestamptz, timestamptz, text
) to anon, authenticated;

-- ── admin_extend_community_event ─────────────────────────────────────────────
-- Push the (informational) event end date out to a new value.
create or replace function public.admin_extend_community_event(
  p_event_id uuid,
  p_ends_at timestamptz,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.community_events
     set ends_at = p_ends_at, status = 'active', updated_at = now()
   where id = p_event_id;

  if not found then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_extend_community_event(uuid, timestamptz, text)
  to anon, authenticated;

-- ── admin_reopen_community_registration ──────────────────────────────────────
-- Reopen / extend registrations by setting a new (future) close time. Also pulls
-- the open time back to now if it was still in the future, so it's open right now.
create or replace function public.admin_reopen_community_registration(
  p_event_id uuid,
  p_registration_closes_at timestamptz,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.community_events
     set registration_closes_at = p_registration_closes_at,
         registration_opens_at = least(coalesce(registration_opens_at, now()), now()),
         updated_at = now()
   where id = p_event_id;

  if not found then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_reopen_community_registration(uuid, timestamptz, text)
  to anon, authenticated;

-- ── admin_close_community_registration ───────────────────────────────────────
-- Close registrations right now (even if the window hadn't expired), by setting
-- the close time to now().
create or replace function public.admin_close_community_registration(
  p_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.community_events
     set registration_closes_at = now(), updated_at = now()
   where id = p_event_id;

  if not found then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_close_community_registration(uuid, text)
  to anon, authenticated;

-- ── admin_delete_community_event ─────────────────────────────────────────────
create or replace function public.admin_delete_community_event(
  p_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  delete from public.community_events where id = p_event_id; -- cascades registrations
  if not found then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_community_event(uuid, text) to anon, authenticated;

-- ── admin_list_community_registrations ───────────────────────────────────────
-- The participant list for one event, joined with each self-registrant's profile
-- (username / avatar / role = "where they come from"). Guarded so members can't
-- read each other's submissions.
create or replace function public.admin_list_community_registrations(
  p_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows json;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce(json_agg(row_to_json(r) order by r.created_at), '[]'::json)
    into v_rows
  from (
    select reg.id,
           reg.event_id,
           reg.profile_id,
           reg.display_name,
           reg.source,
           reg.values,
           reg.created_at,
           reg.updated_at,
           p.username      as profile_username,
           p.display_name  as profile_display_name,
           p.avatar_url    as profile_avatar_url,
           p.role          as profile_role
    from public.community_event_registrations reg
    left join public.profiles p on p.id = reg.profile_id
    where reg.event_id = p_event_id
  ) r;

  return json_build_object('success', true, 'registrations', v_rows);
end;
$$;
grant execute on function public.admin_list_community_registrations(uuid, text)
  to anon, authenticated;

-- ── admin_add_community_registration (manual entry) ──────────────────────────
create or replace function public.admin_add_community_registration(
  p_event_id uuid,
  p_display_name text,
  p_values jsonb,
  p_profile_id uuid default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.community_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  insert into public.community_event_registrations
    (event_id, profile_id, display_name, source, values)
  values (
    p_event_id,
    p_profile_id,
    coalesce(nullif(trim(coalesce(p_display_name, '')), ''), 'Participant'),
    'manual',
    coalesce(p_values, '{}'::jsonb)
  )
  returning * into v_reg;

  return json_build_object('success', true, 'registration_id', v_reg.id);
end;
$$;
grant execute on function public.admin_add_community_registration(uuid, text, jsonb, uuid, text)
  to anon, authenticated;

-- ── admin_update_community_registration ──────────────────────────────────────
create or replace function public.admin_update_community_registration(
  p_registration_id uuid,
  p_display_name text,
  p_values jsonb,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.community_event_registrations
     set display_name = coalesce(nullif(trim(coalesce(p_display_name, '')), ''), display_name),
         values = coalesce(p_values, values),
         updated_at = now()
   where id = p_registration_id;

  if not found then
    return json_build_object('success', false, 'error', 'Registration not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_community_registration(uuid, text, jsonb, text)
  to anon, authenticated;

-- ── admin_delete_community_registration ──────────────────────────────────────
create or replace function public.admin_delete_community_registration(
  p_registration_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  delete from public.community_event_registrations where id = p_registration_id;
  if not found then
    return json_build_object('success', false, 'error', 'Registration not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_community_registration(uuid, text)
  to anon, authenticated;

-- ── admin_clear_community_registrations (delete the whole list) ──────────────
create or replace function public.admin_clear_community_registrations(
  p_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  delete from public.community_event_registrations where event_id = p_event_id;
  get diagnostics v_count = row_count;
  return json_build_object('success', true, 'deleted', v_count);
end;
$$;
grant execute on function public.admin_clear_community_registrations(uuid, text)
  to anon, authenticated;

-- ── register_for_community_event (member self-registration) ──────────────────
-- Authorized by the caller's JWT. Enforces: the event is visible to their role
-- and the registration window is open. Upserts so editing before close re-saves.
create or replace function public.register_for_community_event(
  p_event_id uuid,
  p_values jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_event record;
  v_name text;
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

  select * into v_event from public.community_events where id = p_event_id;
  if v_event is null then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  -- Role gate: the caller's role must be in the event's visible_roles.
  if not (lower(v_profile.role) = any (v_event.visible_roles)) then
    return json_build_object('success', false, 'error', 'This event is not open to your role.');
  end if;

  -- Registration window.
  if v_event.registration_opens_at is not null and now() < v_event.registration_opens_at then
    return json_build_object('success', false, 'error', 'Registration has not opened yet.');
  end if;
  if v_event.registration_closes_at is not null and now() > v_event.registration_closes_at then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;

  v_name := coalesce(nullif(trim(coalesce(v_profile.display_name, '')), ''),
                     v_profile.username, 'Participant');

  insert into public.community_event_registrations
    (event_id, profile_id, display_name, source, values)
  values (p_event_id, v_profile.id, v_name, 'self', coalesce(p_values, '{}'::jsonb))
  on conflict (event_id, profile_id) where profile_id is not null
  do update set values = excluded.values,
                display_name = excluded.display_name,
                updated_at = now();

  return json_build_object('success', true);
end;
$$;
grant execute on function public.register_for_community_event(uuid, jsonb) to anon, authenticated;
