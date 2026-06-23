import { supabase } from "@/lib/supabase";
import { ADMIN_KEY_STORAGE } from "@/services/authService";
import {
  BlitzRegion,
  BlitzStats,
  CommunityEvent,
  CommunityRegistration,
  MyRegistration,
  RegistrationField,
} from "@/types/community-event.types";

// The access-key admin's key (Discord admins are authorized by their JWT and get
// null here). Sent to the guarded RPCs as p_admin_key. Mirrors membersService.
function adminKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

function mapField(raw: unknown): RegistrationField | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const key = typeof r.key === "string" ? r.key : "";
  const label = typeof r.label === "string" ? r.label : "";
  if (!key || !label) return null;
  return {
    key,
    label,
    type: r.type === "number" ? "number" : "text",
    required: !!r.required,
  };
}

function mapEvent(row: Record<string, unknown>): CommunityEvent {
  const fieldsRaw = Array.isArray(row.registration_fields) ? row.registration_fields : [];
  return {
    id: row.id as string,
    kind: row.kind === "list" ? "list" : "event",
    categoryKey: (row.category_key as string) ?? "custom",
    categoryName: (row.category_name as string) ?? "Event",
    title: (row.title as string) ?? "Untitled",
    content: (row.content as string) ?? "",
    visibleRoles: Array.isArray(row.visible_roles)
      ? (row.visible_roles as unknown[]).map((r) => String(r).toLowerCase())
      : [],
    hasLink: !!row.has_link,
    linkLabel: (row.link_label as string) ?? null,
    linkUrl: (row.link_url as string) ?? null,
    startsAt: (row.starts_at as string) ?? null,
    endsAt: (row.ends_at as string) ?? null,
    registrationOpensAt: (row.registration_opens_at as string) ?? null,
    registrationClosesAt: (row.registration_closes_at as string) ?? null,
    registrationFields: fieldsRaw.map(mapField).filter((f): f is RegistrationField => f !== null),
    region: ((): BlitzRegion | null => {
      const r = row.region;
      return r === "eu" || r === "na" || r === "asia" ? r : null;
    })(),
    status: (row.status as string) ?? "active",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function mapRegistration(row: Record<string, unknown>): CommunityRegistration {
  const valuesRaw = row.values;
  const values: Record<string, string> = {};
  if (valuesRaw && typeof valuesRaw === "object") {
    for (const [k, v] of Object.entries(valuesRaw as Record<string, unknown>)) {
      values[k] = v == null ? "" : String(v);
    }
  }
  const statsRaw = row.blitz_stats;
  let blitzStats: BlitzStats | null = null;
  if (statsRaw && typeof statsRaw === "object") {
    const s = statsRaw as Record<string, unknown>;
    blitzStats = {
      battles: Number(s.battles) || 0,
      winrate: Number(s.winrate) || 0,
      avgDamage: Number(s.avgDamage) || 0,
    };
  }
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    profileId: (row.profile_id as string) ?? null,
    displayName: (row.display_name as string) ?? "Participant",
    source: row.source === "manual" ? "manual" : "self",
    values,
    accountId: row.account_id != null ? Number(row.account_id) : null,
    playerName: (row.player_name as string) ?? null,
    blitzStats,
    cardVariant: (row.card_variant as string) ?? null,
    flag: (row.flag as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    profileUsername: (row.profile_username as string) ?? null,
    profileDisplayName: (row.profile_display_name as string) ?? null,
    profileAvatarUrl: (row.profile_avatar_url as string) ?? null,
    profileRole: (row.profile_role as string) ?? null,
  };
}

type RpcResult = { success: boolean; error: string | null };

function unwrap(data: unknown, error: { message: string } | null): RpcResult {
  if (error) return { success: false, error: error.message };
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    return { success: d.success === true, error: (d.error as string) ?? null };
  }
  return { success: true, error: null };
}

// Reads/writes for community events. Reads use the open select policy; admin
// writes and the participant lists go through guarded SECURITY DEFINER RPCs.
export class CommunityEventsService {
  /** All community events, newest first (admin views). */
  static async listEvents(): Promise<CommunityEvent[]> {
    const { data, error } = await supabase
      .from("community_events")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading community events:", error);
      return [];
    }
    return (data ?? []).map((r) => mapEvent(r as Record<string, unknown>));
  }

  /**
   * Create an empty standalone participant list (admin). Returns its id. Pass a
   * Blitz region to make participants validate a real in-game account when added.
   */
  static async createParticipantList(
    name: string,
    region: BlitzRegion | null = null
  ): Promise<{ success: boolean; eventId: string | null; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_create_participant_list", {
      p_name: name,
      p_region: region,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, eventId: null, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      eventId: (d.event_id as string) ?? null,
      error: (d.error as string) ?? null,
    };
  }

  /**
   * The signed-in member's own registrations with full card/flag/stats data
   * (RLS limits the rows to their own). Used to pre-fill the edit dialog and to
   * render their personalized card on the dashboard profile.
   */
  static async listMyRegistrations(): Promise<MyRegistration[]> {
    const { data, error } = await supabase
      .from("community_event_registrations")
      .select("event_id, display_name, player_name, blitz_stats, card_variant, flag");
    if (error) {
      console.error("Error loading my registrations:", error);
      return [];
    }
    return (data ?? []).map((raw) => {
      const r = raw as Record<string, unknown>;
      const s = r.blitz_stats;
      let blitzStats: BlitzStats | null = null;
      if (s && typeof s === "object") {
        const o = s as Record<string, unknown>;
        blitzStats = {
          battles: Number(o.battles) || 0,
          winrate: Number(o.winrate) || 0,
          avgDamage: Number(o.avgDamage) || 0,
        };
      }
      return {
        eventId: r.event_id as string,
        displayName: (r.display_name as string) ?? "Participant",
        playerName: (r.player_name as string) ?? null,
        blitzStats,
        cardVariant: (r.card_variant as string) ?? null,
        flag: (r.flag as string) ?? null,
      };
    });
  }

  /** Event ids the signed-in member has already registered for (own rows only). */
  static async listMyRegisteredEventIds(): Promise<Set<string>> {
    const { data, error } = await supabase
      .from("community_event_registrations")
      .select("event_id");
    if (error) {
      console.error("Error loading my registrations:", error);
      return new Set();
    }
    return new Set((data ?? []).map((r) => (r as { event_id: string }).event_id));
  }

  static async createEvent(input: {
    categoryKey: string;
    categoryName: string;
    title: string;
    content: string;
    visibleRoles: string[];
    hasLink: boolean;
    linkLabel: string | null;
    linkUrl: string | null;
    startsAt: string | null;
    endsAt: string | null;
    registrationOpensAt: string | null;
    registrationClosesAt: string | null;
    registrationFields: RegistrationField[];
    region: BlitzRegion | null;
  }): Promise<{ success: boolean; eventId: string | null; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_create_community_event", {
      p_category_key: input.categoryKey,
      p_category_name: input.categoryName,
      p_title: input.title,
      p_content: input.content,
      p_visible_roles: input.visibleRoles,
      p_has_link: input.hasLink,
      p_link_label: input.linkLabel,
      p_link_url: input.linkUrl,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_registration_opens_at: input.registrationOpensAt,
      p_registration_closes_at: input.registrationClosesAt,
      p_registration_fields: input.registrationFields,
      p_region: input.region,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, eventId: null, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      eventId: (d.event_id as string) ?? null,
      error: (d.error as string) ?? null,
    };
  }

  static async updateEvent(input: {
    eventId: string;
    categoryKey: string;
    categoryName: string;
    title: string;
    content: string;
    visibleRoles: string[];
    hasLink: boolean;
    linkLabel: string | null;
    linkUrl: string | null;
    startsAt: string | null;
    endsAt: string | null;
  }): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_update_community_event", {
      p_event_id: input.eventId,
      p_category_key: input.categoryKey,
      p_category_name: input.categoryName,
      p_title: input.title,
      p_content: input.content,
      p_visible_roles: input.visibleRoles,
      p_has_link: input.hasLink,
      p_link_label: input.linkLabel,
      p_link_url: input.linkUrl,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async extendEvent(eventId: string, endsAt: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_extend_community_event", {
      p_event_id: eventId,
      p_ends_at: endsAt,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async reopenRegistration(eventId: string, closesAt: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_reopen_community_registration", {
      p_event_id: eventId,
      p_registration_closes_at: closesAt,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /** Finish (close) the whole event now — it moves to the Ended tab. */
  static async finishEvent(eventId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_finish_community_event", {
      p_event_id: eventId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /** Close registration immediately, even if the window had not expired. */
  static async closeRegistration(eventId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_close_community_registration", {
      p_event_id: eventId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async deleteEvent(eventId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_delete_community_event", {
      p_event_id: eventId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /**
   * Turn an event into a standalone participant list without losing its
   * registrations. Used by the Events page "Delete event" so the participant
   * list survives in the Participant lists page (only deleted there for good).
   */
  static async convertEventToList(eventId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_convert_event_to_list", {
      p_event_id: eventId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /** The participant list for one event (admin only, via guarded RPC). */
  static async listRegistrations(eventId: string): Promise<CommunityRegistration[]> {
    const { data, error } = await supabase.rpc("admin_list_community_registrations", {
      p_event_id: eventId,
      p_admin_key: adminKey(),
    });
    if (error) {
      console.error("Error loading registrations:", error);
      return [];
    }
    const d = (data ?? {}) as Record<string, unknown>;
    const rows = Array.isArray(d.registrations) ? d.registrations : [];
    return rows.map((r) => mapRegistration(r as Record<string, unknown>));
  }

  static async addRegistration(
    eventId: string,
    displayName: string,
    values: Record<string, string>,
    blitz?: { accountId?: number | null; playerName: string; stats: BlitzStats } | null,
    profileId: string | null = null,
    card?: { variant?: string | null; flag?: string | null }
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_add_community_registration", {
      p_event_id: eventId,
      p_display_name: displayName,
      p_values: values,
      p_account_id: blitz?.accountId ?? null,
      p_player_name: blitz?.playerName ?? null,
      p_blitz_stats: blitz?.stats ?? null,
      p_profile_id: profileId,
      p_card_variant: card?.variant ?? null,
      p_flag: card?.flag ?? null,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async updateRegistration(
    registrationId: string,
    displayName: string,
    values: Record<string, string>,
    blitz?: { accountId: number; playerName: string; stats: BlitzStats } | null,
    card?: { variant?: string | null; flag?: string | null }
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_update_community_registration", {
      p_registration_id: registrationId,
      p_display_name: displayName,
      p_values: values,
      p_account_id: blitz?.accountId ?? null,
      p_player_name: blitz?.playerName ?? null,
      p_blitz_stats: blitz?.stats ?? null,
      p_card_variant: card?.variant ?? null,
      p_flag: card?.flag ?? null,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async deleteRegistration(registrationId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_delete_community_registration", {
      p_registration_id: registrationId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async clearRegistrations(eventId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_clear_community_registrations", {
      p_event_id: eventId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /**
   * Replace the auction player pool with the participants of a community list
   * (guarded). Used when creating an auction from a finished registration list.
   * Pass shuffle = true to randomize the order players come up for auction.
   */
  static async replacePlayersFromList(
    listEventId: string,
    basePrice: number,
    shuffle = false
  ): Promise<{ success: boolean; count: number; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_replace_players_from_list", {
      p_list_event_id: listEventId,
      p_base_price: basePrice,
      p_shuffle: shuffle,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, count: 0, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      count: Number(d.count) || 0,
      error: (d.error as string) ?? null,
    };
  }

  /** Member self-registration (authorized by their JWT). */
  static async register(
    eventId: string,
    values: Record<string, string>,
    blitz?: { accountId: number; playerName: string; stats: BlitzStats } | null,
    card?: { variant?: string | null; flag?: string | null }
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("register_for_community_event", {
      p_event_id: eventId,
      p_values: values,
      p_account_id: blitz?.accountId ?? null,
      p_player_name: blitz?.playerName ?? null,
      p_blitz_stats: blitz?.stats ?? null,
      p_card_variant: card?.variant ?? null,
      p_flag: card?.flag ?? null,
    });
    return unwrap(data, error);
  }

  /** Member self-withdrawal: cancel their own registration (window must be open). */
  static async withdraw(eventId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("withdraw_from_community_event", {
      p_event_id: eventId,
    });
    return unwrap(data, error);
  }
}
