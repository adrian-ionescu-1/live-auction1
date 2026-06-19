-- ============================================================================
-- Fix auction concurrency / scaling issues observed under load
-- (~10 users, ~120 players, broke around player 60-70).
--
-- Run this in the Supabase SQL Editor. It is idempotent (CREATE OR REPLACE /
-- CREATE INDEX IF NOT EXISTS) and safe to re-run.
--
-- What it changes:
--   S1  Serialize bids/settle per player with a transaction advisory lock,
--       so concurrent bids can no longer race (wrong/duplicate highest bid).
--   S2  settle_player runs exactly once per player (idempotency guard),
--       preventing a double balance deduction on a re-fired admin tick.
--   S3  Replace the O(sold_players x bids) target-count query (which got
--       progressively slower as players were sold) with an O(1)-ish count
--       from players.sold_to_user_id (the settled source of truth).
--   S4  Add a hot-path index for highest-bid / settle lookups.
-- ============================================================================

-- ── S4: hot-path index ──────────────────────────────────────────────────────
create index if not exists idx_bids_player_amount
  on public.bids (player_id, amount desc, created_at);

-- ── S1: place_bid_core — serialize bids per player (atomic read-check-insert) ─
create or replace function public.place_bid_core(p_player_id uuid, p_user_id uuid, p_amount integer)
 returns json
 language plpgsql
as $function$
declare
  v_auction_id uuid;
  v_current_player_id uuid;
  v_auction_status text;
  v_user_balance integer;
  v_current_highest_bid integer := 0;
  v_player_base_price integer;
  v_current_time_remaining integer;
  v_new_time_remaining integer;
  v_bid_id uuid;
begin
  if p_player_id is null then
    return json_build_object('success', false, 'error', 'Player ID is required');
  end if;
  if p_user_id is null then
    return json_build_object('success', false, 'error', 'User ID is required');
  end if;
  if p_amount is null or p_amount <= 0 then
    return json_build_object('success', false, 'error', 'Bid amount must be greater than 0');
  end if;

  -- S1: all bids for the same player serialize here (lock auto-released at tx end)
  perform pg_advisory_xact_lock(hashtext(p_player_id::text));

  select id, current_player_id, status, time_remaining
  into v_auction_id, v_current_player_id, v_auction_status, v_current_time_remaining
  from public.auction_state
  limit 1;

  if v_auction_id is null then
    return json_build_object('success', false, 'error', 'No auction state found');
  end if;
  if v_auction_status != 'active' then
    return json_build_object('success', false, 'error', 'Auction is not active');
  end if;
  if v_current_player_id is null or v_current_player_id != p_player_id then
    return json_build_object('success', false, 'error', 'This player is not currently being auctioned');
  end if;

  select balance into v_user_balance from public.users where id = p_user_id;
  if v_user_balance is null then
    return json_build_object('success', false, 'error', 'User not found');
  end if;
  if v_user_balance < p_amount then
    return json_build_object('success', false, 'error', 'Insufficient balance');
  end if;

  select base_price into v_player_base_price from public.players where id = p_player_id;
  if v_player_base_price is null then
    return json_build_object('success', false, 'error', 'Player not found');
  end if;

  select coalesce(max(amount), 0) into v_current_highest_bid
  from public.bids where player_id = p_player_id;

  if v_current_highest_bid = 0 then
    if p_amount < v_player_base_price then
      return json_build_object('success', false,
        'error', 'Bid must be at least the base price of ' || v_player_base_price);
    end if;
  else
    if p_amount <= v_current_highest_bid then
      return json_build_object('success', false,
        'error', 'Bid must be higher than current bid of ' || v_current_highest_bid);
    end if;
  end if;

  insert into public.bids (player_id, user_id, amount)
  values (p_player_id, p_user_id, p_amount)
  returning id into v_bid_id;

  if v_bid_id is null then
    return json_build_object('success', false, 'error', 'Failed to insert bid');
  end if;

  -- Timer extend: if <= 10s remaining, add 5s (capped at 30)
  v_new_time_remaining := v_current_time_remaining;
  if v_current_time_remaining <= 10 then
    v_new_time_remaining := least(v_current_time_remaining + 5, 30);
  end if;

  update public.auction_state
  set current_highest_bid_id = v_bid_id,
      time_remaining = v_new_time_remaining,
      updated_at = now()
  where id = v_auction_id;

  if not found then
    return json_build_object('success', false, 'error', 'Failed to update auction state');
  end if;

  return json_build_object('success', true, 'error', null);
end;
$function$;

-- ── S1 + S3: place_bid — lock + cheap/correct target count ───────────────────
create or replace function public.place_bid(p_player_id uuid, p_user_id uuid, p_amount integer)
 returns jsonb
 language plpgsql
as $function$
declare
  v_user record;
  v_target int := 10;
  v_top_bidder_id uuid;
  v_won_count int := 0;
begin
  -- S1: serialize validation + insert for this player
  perform pg_advisory_xact_lock(hashtext(p_player_id::text));

  select * into v_user from public.users where id = p_user_id;
  if v_user is null then
    return public.place_bid_core(p_player_id, p_user_id, p_amount);
  end if;

  if v_user.role = 'USER' then
    -- ANTI-SPAM: no two consecutive bids on the same player
    select b.user_id into v_top_bidder_id
    from public.bids b
    where b.player_id = p_player_id
    order by b.amount desc, b.created_at desc
    limit 1;

    if v_top_bidder_id is not null and v_top_bidder_id = p_user_id then
      return jsonb_build_object('success', false,
        'error', 'You cannot bid twice in a row. Wait for another user to bid.');
    end if;

    -- S3: target count straight from the settled source of truth (fast + correct)
    select count(*) into v_won_count
    from public.players
    where sold_to_user_id = p_user_id;

    if v_won_count >= v_target then
      return jsonb_build_object('success', false, 'error', 'Target reached. Bidding locked.');
    end if;
  end if;

  return public.place_bid_core(p_player_id, p_user_id, p_amount);
end;
$function$;

-- ── S1 + S2: settle_player — lock + run exactly once ─────────────────────────
create or replace function public.settle_player(p_player_id uuid)
 returns json
 language plpgsql
as $function$
declare
    v_auction_id uuid;
    v_status text;
    v_current_player_id uuid;
    v_highest_bid record;
    v_winner_user_id uuid := null;
    v_winning_amount integer := null;
    v_current_sold_players text[];
    v_current_unsold_players text[];
    v_user_balance integer;
begin
    if p_player_id is null then
        return json_build_object('success', false, 'error', 'Player ID is required',
            'winner_user_id', null, 'winning_amount', null);
    end if;

    -- S1: serialize with bids on this player
    perform pg_advisory_xact_lock(hashtext(p_player_id::text));

    select id, sold_players, unsold_players, status, current_player_id
      into v_auction_id, v_current_sold_players, v_current_unsold_players, v_status, v_current_player_id
    from public.auction_state
    limit 1;

    if v_auction_id is null then
        return json_build_object('success', false, 'error', 'No auction state found',
            'winner_user_id', null, 'winning_amount', null);
    end if;

    -- S2: idempotency — only settle the active, current player once.
    -- A re-fired/duplicate settle sees status = 'result' and bails (no double charge).
    if v_status is distinct from 'active' or v_current_player_id is distinct from p_player_id then
        return json_build_object('success', false, 'error', 'Already settled or not the active player',
            'winner_user_id', null, 'winning_amount', null);
    end if;

    -- Highest bid: amount desc, created_at asc (tie-breaker = earliest)
    select b.user_id, b.amount, b.id into v_highest_bid
    from public.bids b
    where b.player_id = p_player_id
    order by b.amount desc, b.created_at asc
    limit 1;

    if v_highest_bid.user_id is not null then
        v_winner_user_id := v_highest_bid.user_id;
        v_winning_amount := v_highest_bid.amount;

        select balance into v_user_balance from public.users where id = v_winner_user_id;
        if v_user_balance is null or v_user_balance < v_winning_amount then
            return json_build_object('success', false, 'error', 'Insufficient user balance',
                'winner_user_id', null, 'winning_amount', null);
        end if;

        update public.users
        set balance = balance - v_winning_amount
        where id = v_winner_user_id and balance >= v_winning_amount;
        if not found then
            return json_build_object('success', false, 'error', 'Failed to update user balance',
                'winner_user_id', null, 'winning_amount', null);
        end if;

        update public.players
        set sold_to_user_id = v_winner_user_id, sold_amount = v_winning_amount
        where id = p_player_id;

        v_current_sold_players := coalesce(v_current_sold_players, array[]::text[]);
        if not (p_player_id::text = any(v_current_sold_players)) then
          v_current_sold_players := array_append(v_current_sold_players, p_player_id::text);
        end if;
        v_current_unsold_players := coalesce(v_current_unsold_players, array[]::text[]);
        v_current_unsold_players := array_remove(v_current_unsold_players, p_player_id::text);
    else
        -- UNSOLD: mark for re-auction
        v_current_unsold_players := coalesce(v_current_unsold_players, array[]::text[]);
        if not (p_player_id::text = any(v_current_unsold_players)) then
          v_current_unsold_players := array_append(v_current_unsold_players, p_player_id::text);
        end if;
        v_current_sold_players := coalesce(v_current_sold_players, array[]::text[]);
        v_current_sold_players := array_remove(v_current_sold_players, p_player_id::text);

        update public.players
        set sold_to_user_id = null, sold_amount = null
        where id = p_player_id;
    end if;

    update public.auction_state
    set status = 'result',
        countdown = 3,
        sold_players = v_current_sold_players,
        unsold_players = v_current_unsold_players
    where id = v_auction_id;

    if not found then
        return json_build_object('success', false, 'error', 'Failed to update auction state',
            'winner_user_id', null, 'winning_amount', null);
    end if;

    return json_build_object('success', true, 'error', null,
        'winner_user_id', v_winner_user_id, 'winning_amount', v_winning_amount);
exception when others then
    return json_build_object('success', false, 'error', sqlerrm,
        'winner_user_id', null, 'winning_amount', null);
end;
$function$;
