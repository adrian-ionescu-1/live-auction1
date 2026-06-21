-- ============================================================================
-- Admin: permanently delete a member.
--
-- Removes the member from the directory completely — not a ban, a full delete.
-- We delete the underlying auth.users row; because profiles.id references
-- auth.users(id) ON DELETE CASCADE, that cascade removes their profile (and so
-- their role) and their auction_event_members rows. public.users.profile_id is
-- ON DELETE SET NULL, so any historical auction participant row is just unlinked,
-- not destroyed (event results stay intact).
--
-- Effect for the person: signing in with Discord again creates a brand-new
-- auth user, which fires handle_new_user and gives them a fresh 'guest' profile —
-- exactly like a first-time member.
--
-- Guarded by is_admin_request() like every other admin write.
--
-- Run AFTER 20260621030000_admin_authorization_events.sql. Idempotent.
-- ============================================================================

create or replace function public.admin_delete_member(p_member_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;

  if not exists (select 1 from public.profiles where id = p_member_id) then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;

  -- Cascades to public.profiles and auction_event_members; unlinks users rows.
  delete from auth.users where id = p_member_id;

  return json_build_object('success', true);
end;
$$;

grant execute on function public.admin_delete_member(uuid) to anon, authenticated;
