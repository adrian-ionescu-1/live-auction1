-- ============================================================================
-- Standalone participant lists.
--
-- Until now a participant list only existed as the registration list of a
-- community event. This adds a second kind of community_events row — a plain
-- "list" the admin creates directly (e.g. by importing a CSV/Excel), with no
-- announcement, no roles and no registration window. Both kinds can feed an
-- auction's player pool.
--
--   kind = 'event' -> an announcement members register for (the original).
--   kind = 'list'  -> an admin-managed list of participants (manual / imported).
--
-- Run AFTER 20260621070000_auction_from_list.sql. Idempotent / safe to re-run.
-- ============================================================================

alter table public.community_events
  add column if not exists kind text not null default 'event';

-- ── admin_create_participant_list ────────────────────────────────────────────
-- Create an empty standalone list. Participants are added afterwards via the
-- existing admin_add_community_registration / import flow.
create or replace function public.admin_create_participant_list(
  p_name text,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('success', false, 'error', 'List name is required');
  end if;

  insert into public.community_events (
    kind, category_key, category_name, title, content,
    visible_roles, registration_fields, created_by
  ) values (
    'list', 'custom', 'List', trim(p_name), '',
    '{}', '[]'::jsonb, auth.uid()
  )
  returning * into v_event;

  return json_build_object('success', true, 'event_id', v_event.id);
end;
$$;
grant execute on function public.admin_create_participant_list(text, text)
  to anon, authenticated;
