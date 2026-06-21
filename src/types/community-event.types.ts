// Types for community events (anunțuri) — a separate feature from the named
// auction events. A community event is an announcement the admin posts for one
// or more roles; eligible members register by filling an admin-defined set of
// fields. See supabase/migrations/20260621050000_community_events.sql.

export type BlitzRegion = "eu" | "na" | "asia";

/** Career stats pulled from the Wargaming Blitz API at registration time. */
export interface BlitzStats {
  battles: number;
  /** Win rate as a percentage, e.g. 76.0. */
  winrate: number;
  /** Average damage per battle. */
  avgDamage: number;
}

export type RegistrationFieldType = "text" | "number";

/** One admin-defined field a participant must (or may) fill when registering. */
export interface RegistrationField {
  /** Stable key used to store the value. Derived from the label at creation. */
  key: string;
  label: string;
  type: RegistrationFieldType;
  required: boolean;
}

export interface CommunityEvent {
  id: string;
  /** 'event' = an announcement members register for; 'list' = a standalone admin list. */
  kind: "event" | "list";
  /** Preset slug ('wot_blitz', …) or 'custom'. Drives the #hashtag styling. */
  categoryKey: string;
  /** Human label for the type tag (the typed name when categoryKey = 'custom'). */
  categoryName: string;
  title: string;
  content: string;
  /** Lowercased role slugs allowed to see + register for this event. */
  visibleRoles: string[];
  hasLink: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
  /** Informational only — never gate anything. */
  startsAt: string | null;
  endsAt: string | null;
  /** Registration window. Outside it, registration is closed. */
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  registrationFields: RegistrationField[];
  /** WoT Blitz region this event targets, or null for a non-Blitz event. */
  region: BlitzRegion | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** The signed-in member's own registration (for editing + the profile card). */
export interface MyRegistration {
  eventId: string;
  displayName: string;
  playerName: string | null;
  blitzStats: BlitzStats | null;
  cardVariant: string | null;
  flag: string | null;
}

/** A participant's submission, as the admin sees it (joined with their profile). */
export interface CommunityRegistration {
  id: string;
  eventId: string;
  profileId: string | null;
  displayName: string;
  source: "self" | "manual";
  values: Record<string, string>;
  /** Validated Wargaming account id (Blitz events), or null. */
  accountId: number | null;
  /** Canonical in-game nickname captured at validation, or null. */
  playerName: string | null;
  /** Career stats captured at validation, or null. */
  blitzStats: BlitzStats | null;
  /** Chosen card design id (see cardDesigns), or null for the default. */
  cardVariant: string | null;
  /** Chosen country flag (ISO alpha-2 code), or null for none. */
  flag: string | null;
  createdAt: string;
  updatedAt: string;
  /** Profile of a self-registrant ("where they come from"). Null for manual rows. */
  profileUsername: string | null;
  profileDisplayName: string | null;
  profileAvatarUrl: string | null;
  profileRole: string | null;
}
