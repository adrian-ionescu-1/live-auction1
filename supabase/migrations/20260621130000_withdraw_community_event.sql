-- ============================================================================
-- Member self-withdrawal from a community event.
--
-- A member can cancel their OWN registration while the registration window is
-- still open (mirrors register_for_community_event's window check). Authorized by
-- the caller's JWT — it only ever deletes their own row. Once registration has
-- closed the list is final, so withdrawal is refused (an admin can still remove
-- them via admin_delete_community_registration).
--
-- Run AFTER 20260621120000_profiles_multi_role.sql. Idempotent / safe to re-run.
-- ============================================================================

create or replace function public.withdraw_from_community_event(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_deleted int;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  select * into v_event from public.community_events where id = p_event_id;
  if v_event is null then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  -- Only while registration is still open (closed lists are final).
  if v_event.registration_closes_at is not null and now() > v_event.registration_closes_at then
    return json_build_object(
      'success', false,
      'error', 'Registration has closed — ask an admin to remove you.'
    );
  end if;

  delete from public.community_event_registrations
   where event_id = p_event_id
     and profile_id = auth.uid();
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    return json_build_object('success', false, 'error', 'You are not registered for this event.');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.withdraw_from_community_event(uuid) to anon, authenticated;
