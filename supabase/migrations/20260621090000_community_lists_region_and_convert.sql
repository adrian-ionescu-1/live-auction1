-- ============================================================================
-- Standalone list regions + "delete event keeps its list".
--
-- Two refinements to community events / participant lists:
--
--   1. A standalone participant list (kind = 'list') can now target a WoT Blitz
--      region. When it does, the admin adds participants by validating a real
--      in-game account (the same Blitz search flow events use) instead of — or
--      alongside — importing a CSV/Excel. region = null keeps the plain list.
--
--   2. Deleting an event must NOT destroy the participants who registered for it.
--      admin_convert_event_to_list turns an event row into a standalone list
--      (kind = 'list'), keeping every registration. The list then lives on in the
--      Participant lists page and is only removed for good when deleted there
--      (admin_delete_community_event, which cascades its registrations).
--
-- Run AFTER 20260621080000_standalone_participant_lists.sql. Idempotent.
-- ============================================================================

-- ── admin_create_participant_list (now carries an optional region) ───────────
drop function if exists public.admin_create_participant_list(text, text);
create or replace function public.admin_create_participant_list(
  p_name text,
  p_region text default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_region text;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('success', false, 'error', 'List name is required');
  end if;

  v_region := lower(nullif(trim(coalesce(p_region, '')), ''));
  if v_region is not null and v_region not in ('eu', 'na', 'asia') then
    v_region := null;
  end if;

  insert into public.community_events (
    kind, category_key, category_name, title, content,
    visible_roles, registration_fields, region, created_by
  ) values (
    'list', 'custom', 'List', trim(p_name), '',
    '{}', '[]'::jsonb, v_region, auth.uid()
  )
  returning * into v_event;

  return json_build_object('success', true, 'event_id', v_event.id);
end;
$$;
grant execute on function public.admin_create_participant_list(text, text, text)
  to anon, authenticated;

-- ── admin_convert_event_to_list ──────────────────────────────────────────────
-- "Delete" an event from the admin Events page without losing its participants:
-- the row becomes a standalone list (kind = 'list'), its role visibility is
-- dropped (a list isn't an announcement) and its registrations are kept intact.
create or replace function public.admin_convert_event_to_list(
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
     set kind = 'list',
         visible_roles = '{}',
         has_link = false,
         link_label = null,
         link_url = null,
         updated_at = now()
   where id = p_event_id
     and kind = 'event';

  if not found then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_convert_event_to_list(uuid, text)
  to anon, authenticated;
