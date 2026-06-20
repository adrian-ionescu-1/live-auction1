import { supabase } from "@/lib/supabase";
import {
  AuctionEvent,
  EventMember,
  EventResult,
  MyEventResults,
} from "@/types/event.types";

// Reads/writes for named auction events. Writes go through SECURITY DEFINER
// RPCs (the admin runs on the anon client); reads use the open select policies.
export class EventsService {
  private static mapEvent(row: Record<string, unknown>): AuctionEvent {
    return {
      id: row.id as string,
      name: (row.name as string) ?? "Untitled",
      playerLimit: Number(row.player_limit) || 0,
      entryFee: Number(row.entry_fee) || 0,
      margin: Number(row.margin) || 0,
      reservePerPlayer: Number(row.reserve_per_player) || 0,
      totalReserve: Number(row.total_reserve) || 0,
      memberBudget: Number(row.member_budget) || 0,
      playerDuration: Number(row.player_duration) || 30,
      extendThreshold: Number(row.extend_threshold) || 0,
      extendAmount: Number(row.extend_amount) || 0,
      bidStart: Number(row.bid_start) || 0,
      bidIncrements: Array.isArray(row.bid_increments)
        ? (row.bid_increments as number[]).map((n) => Number(n)).filter((n) => n > 0)
        : [10, 50, 100, 500, 1000],
      status: (row.status as AuctionEvent["status"]) ?? "live",
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
      availableAt: (row.available_at as string) ?? null,
      finishedAt: (row.finished_at as string) ?? null,
    };
  }

  /** All events, newest first. */
  static async listEvents(): Promise<AuctionEvent[]> {
    const { data, error } = await supabase
      .from("auction_events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading events:", error);
      return [];
    }
    return (data ?? []).map((r) => EventsService.mapEvent(r as Record<string, unknown>));
  }

  /** The event the auction room is currently bound to, or null. */
  static async getLiveEvent(): Promise<AuctionEvent | null> {
    const { data: state, error: stateError } = await supabase
      .from("auction_state")
      .select("event_id")
      .limit(1)
      .maybeSingle();

    if (stateError || !state?.event_id) return null;

    const { data, error } = await supabase
      .from("auction_events")
      .select("*")
      .eq("id", state.event_id as string)
      .maybeSingle();

    if (error || !data) return null;
    return EventsService.mapEvent(data as Record<string, unknown>);
  }

  /** Members enrolled in an event, joined with their profile for display. */
  static async listEventMembers(eventId: string): Promise<EventMember[]> {
    const { data, error } = await supabase
      .from("auction_event_members")
      .select("profile_id, profiles ( username, avatar_url, role, banned )")
      .eq("event_id", eventId);

    if (error) {
      console.error("Error loading event members:", error);
      return [];
    }

    type ProfileJoin = {
      username: string | null;
      avatar_url: string | null;
      role: string | null;
      banned: boolean | null;
    };

    return (data ?? []).map((row) => {
      const r = row as unknown as {
        profile_id: string;
        // Supabase types a many-to-one embed as an array; it is a single row here.
        profiles: ProfileJoin | ProfileJoin[] | null;
      };
      const p = Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles;
      return {
        profileId: r.profile_id,
        username: p?.username ?? "guest",
        avatarUrl: p?.avatar_url ?? null,
        role: p?.role ?? "guest",
        banned: !!p?.banned,
      };
    });
  }

  /** Final results for an event: who won which players, for how much. */
  static async listEventResults(eventId: string): Promise<EventResult[]> {
    const { data, error } = await supabase
      .from("auction_event_results")
      .select("player_id, player_name, user_id, username, amount, via_random, won_at")
      .eq("event_id", eventId)
      .order("username", { ascending: true })
      .order("won_at", { ascending: true });

    if (error) {
      console.error("Error loading event results:", error);
      return [];
    }

    return (data ?? []).map((row) => EventsService.mapResult(row as Record<string, unknown>));
  }

  private static mapResult(r: Record<string, unknown>): EventResult {
    return {
      playerId: r.player_id as string,
      playerName: (r.player_name as string) ?? "Unknown player",
      userId: (r.user_id as string) ?? null,
      username: (r.username as string) ?? "Unknown",
      amount: Number(r.amount) || 0,
      viaRandom: !!r.via_random,
      wonAt: r.won_at as string,
    };
  }

  /** The signed-in member's results across events (for their dashboard). */
  static async listMyResults(profileId: string): Promise<MyEventResults[]> {
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!userRow?.id) return [];

    const { data, error } = await supabase
      .from("auction_event_results")
      .select(
        "player_id, player_name, user_id, username, amount, via_random, won_at, event_id, auction_events ( name, status, finished_at )"
      )
      .eq("user_id", userRow.id as string)
      .order("won_at", { ascending: true });

    if (error) {
      console.error("Error loading my results:", error);
      return [];
    }

    type EventJoin = { name: string | null; status: string | null; finished_at: string | null };
    const groups = new Map<string, MyEventResults>();
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const eventId = r.event_id as string;
      const join = r.auction_events as EventJoin | EventJoin[] | null;
      const ev = Array.isArray(join) ? join[0] ?? null : join;
      if (!groups.has(eventId)) {
        groups.set(eventId, {
          eventId,
          eventName: ev?.name ?? "Event",
          status: (ev?.status as MyEventResults["status"]) ?? "live",
          finishedAt: ev?.finished_at ?? null,
          results: [],
        });
      }
      groups.get(eventId)!.results.push(EventsService.mapResult(r));
    }

    // Newest event first (by finished_at when present, else keep insertion).
    return Array.from(groups.values()).reverse();
  }

  /** Finalize the live event now: distribute leftover players randomly + close. */
  static async finalizeEvent(): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase.rpc("finalize_event_random");
    if (error) return { success: false, error: error.message };
    if (data && typeof data === "object") {
      return { success: data.success === true, error: data.error ?? null };
    }
    return { success: true, error: null };
  }

  /** Create an event and bind it live. Returns the new event id on success. */
  static async createEvent(input: {
    name: string;
    playerLimit: number;
    /** Opening bid / entry. The reserve derives from this + the smallest button. */
    openingBid: number;
    memberBudget: number;
    playerDuration: number;
    extendThreshold: number;
    extendAmount: number;
    bidIncrements: number[];
  }): Promise<{ success: boolean; eventId: string | null; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_create_event", {
      p_name: input.name,
      p_player_limit: input.playerLimit,
      p_opening_bid: input.openingBid,
      p_member_budget: input.memberBudget,
      p_player_duration: input.playerDuration,
      p_extend_threshold: input.extendThreshold,
      p_extend_amount: input.extendAmount,
      p_bid_increments: input.bidIncrements,
    });

    if (error) return { success: false, eventId: null, error: error.message };
    if (data && typeof data === "object") {
      return {
        success: data.success === true,
        eventId: data.event_id ?? null,
        error: data.error ?? null,
      };
    }
    return { success: false, eventId: null, error: "Unexpected response" };
  }

  /** Delete an event (unbinds + idles the room if it was live). */
  static async deleteEvent(
    eventId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_delete_event", {
      p_event_id: eventId,
    });
    if (error) return { success: false, error: error.message };
    if (data && typeof data === "object") {
      return { success: data.success === true, error: data.error ?? null };
    }
    return { success: true, error: null };
  }

  /** Add one member to an event (and provision their participant). */
  static async addMember(
    eventId: string,
    profileId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_add_event_member", {
      p_event_id: eventId,
      p_profile_id: profileId,
    });
    if (error) return { success: false, error: error.message };
    if (data && typeof data === "object") {
      return { success: data.success === true, error: data.error ?? null };
    }
    return { success: true, error: null };
  }

  /** Switch which event the auction room runs. */
  static async setLiveEvent(
    eventId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_set_live_event", {
      p_event_id: eventId,
    });
    if (error) return { success: false, error: error.message };
    if (data && typeof data === "object") {
      return { success: data.success === true, error: data.error ?? null };
    }
    return { success: true, error: null };
  }

  /** Reset the live event (balances back to reserve, bids cleared). */
  static async resetLiveEvent(): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_reset_event");
    if (error) return { success: false, error: error.message };
    if (data && typeof data === "object") {
      return { success: data.success === true, error: data.error ?? null };
    }
    return { success: true, error: null };
  }
}
