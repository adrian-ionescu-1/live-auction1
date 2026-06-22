// Shared option lists + the Discord handle used by the contact forms (visitor +
// member) and the API route. Keeping the values here means the client labels and
// the server-side validation never drift apart.

/** Discord handle the owner answers on (shown on the contact cards). */
export const DISCORD_HANDLE = "_the_adrian_";

/** What a visitor wants to talk about. */
export const CONTACT_TOPICS = [
  { value: "wotblitz_event", label: "Host a WoT Blitz event" },
  { value: "tournaments", label: "Tournaments" },
  { value: "auctions", label: "Auctions" },
  { value: "other", label: "Other" },
] as const;

/** Game a signed-in member is writing about. */
export const CONTACT_GAMES = [
  { value: "wotblitz", label: "WoT Blitz" },
  { value: "other", label: "Other" },
] as const;

/** Why a signed-in member is reaching out. */
export const CONTACT_REASONS = [
  { value: "request", label: "Request" },
  { value: "complaint", label: "Complaint" },
  { value: "error", label: "Error / bug" },
  { value: "suggestion", label: "Suggestion" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];
export type ContactGame = (typeof CONTACT_GAMES)[number]["value"];
export type ContactReason = (typeof CONTACT_REASONS)[number]["value"];

export const TOPIC_VALUES = CONTACT_TOPICS.map((t) => t.value);
export const GAME_VALUES = CONTACT_GAMES.map((g) => g.value);
export const REASON_VALUES = CONTACT_REASONS.map((r) => r.value);

export function labelFor(
  list: readonly { value: string; label: string }[],
  value: string
): string {
  return list.find((o) => o.value === value)?.label ?? value;
}
