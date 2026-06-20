-- ============================================================================
-- Per-event final results (who took which players, for how much).
--
-- The global players table only holds the CURRENT auction's sold markers, which
-- are cleared on reset / new event. To keep a permanent, per-event record we
-- snapshot every sold player into auction_event_results the moment it settles.
--
--   * auction_event_results -> one row per (event, player) won: player + winner
--                              + amount, captured at settle time via a trigger.
--   * record_player_result()  -> trigger on players: when a player becomes sold,
--                                write the result against the live event.
--   * mark_event_finished()    -> trigger on auction_state: when the auction ends,
--                                mark the bound event finished.
--   * _reset_live_auction_rows -> now also clears the event's results and flips it
--                                back to 'live' (a reset re-runs the same event).
--
-- Run AFTER 20260620220000_reserve_from_bids.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
create table if not exists public.auction_event_results (
  event_id    uuid not null references public.auction_events (id) on delete cascade,
  player_id   uuid not null,
  player_name text not null,
  user_id     uuid,
  username    text,
  amount      int  not null default 0,
  won_at      timestamptz not null default now(),
  primary key (event_id, player_id)
);

alter table public.auction_event_results enable row level security;
drop policy if exists event_results_select_all on public.auction_event_results;
create policy event_results_select_all on public.auction_event_results for select using (true);

-- ── Record a result when a player becomes sold ───────────────────────────────
create or replace function public.record_player_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_username text;
begin
  -- Only when a player transitions into "sold" (ignore re-auction clears).
  if new.sold_to_user_id is not null
     and new.sold_to_user_id is distinct from old.sold_to_user_id then
    select event_id into v_event_id from public.auction_state limit 1;
    if v_event_id is not null then
      select username into v_username from public.users where id = new.sold_to_user_id;

      insert into public.auction_event_results
        (event_id, player_id, player_name, user_id, username, amount, won_at)
      values
        (v_event_id, new.id, new.name, new.sold_to_user_id,
         coalesce(v_username, 'Unknown'), coalesce(new.sold_amount, 0), now())
      on conflict (event_id, player_id) do update
        set user_id     = excluded.user_id,
            username    = excluded.username,
            amount      = excluded.amount,
            player_name = excluded.player_name,
            won_at      = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_record_player_result on public.players;
create trigger trg_record_player_result
  after update of sold_to_user_id, sold_amount on public.players
  for each row execute function public.record_player_result();

-- ── Mark the event finished when the auction ends ────────────────────────────
create or replace function public.mark_event_finished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished'
     and old.status is distinct from 'finished'
     and new.event_id is not null then
    update public.auction_events
       set status = 'finished', finished_at = now()
     where id = new.event_id and status <> 'finished';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_event_finished on public.auction_state;
create trigger trg_mark_event_finished
  after update of status on public.auction_state
  for each row execute function public.mark_event_finished();

-- ── _reset_live_auction_rows: also clear results + re-open the event ─────────
create or replace function public._reset_live_auction_rows(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction_id uuid;
begin
  select id into v_auction_id from public.auction_state limit 1;

  update public.auction_state
     set event_id = p_event_id,
         status = 'idle',
         current_player_id = null,
         current_player_index = -1,
         countdown = 3,
         time_remaining = 30,
         phase_ends_at = null,
         current_highest_bid_id = null,
         current_round = 1,
         round_total_players = 0,
         round_current_index = 0,
         sold_players = '{}',
         unsold_players = '{}',
         updated_at = now()
   where id = v_auction_id;

  delete from public.bids where true;

  update public.players
     set sold_to_user_id = null, sold_amount = null
   where sold_to_user_id is not null;

  -- A reset re-runs the same event: wipe its recorded results and re-open it.
  delete from public.auction_event_results where event_id = p_event_id;
  update public.auction_events
     set status = 'live', finished_at = null
   where id = p_event_id;
end;
$$;
grant execute on function public._reset_live_auction_rows(uuid) to anon, authenticated;
