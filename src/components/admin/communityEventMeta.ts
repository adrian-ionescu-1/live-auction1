// Shared metadata for community events: the preset "type" categories shown in
// the create form and the chip styling for the #hashtag tag. The list is easy to
// grow as new games/categories are added.

export type CategoryPreset = { key: string; label: string };

// Preset event types. "custom" lets the admin type their own category name.
export const EVENT_CATEGORY_PRESETS: CategoryPreset[] = [
  { key: "wot_blitz", label: "World of Tanks Blitz" },
  { key: "wot", label: "World of Tanks" },
  { key: "general", label: "General" },
  { key: "custom", label: "Custom" },
];

// Chip colors per known category; unknown/custom falls back to a neutral chip.
const CATEGORY_CHIP: Record<string, string> = {
  wot_blitz: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
  wot: "bg-orange-400/15 text-orange-200 ring-orange-400/30",
  general: "bg-sky-400/15 text-sky-200 ring-sky-400/30",
};

export function categoryChip(key: string): string {
  return CATEGORY_CHIP[key] ?? "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/30";
}

// "World of Tanks Blitz" -> "#WorldOfTanksBlitz" for the small tag.
export function categoryHashtag(name: string): string {
  const compact = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return `#${compact || "Event"}`;
}

export type RegistrationState = "before" | "open" | "closed";

// Where the registration window stands right now. A null open time means "open
// from the start"; a null close time means "never closes on its own".
export function registrationState(
  opensAt: string | null,
  closesAt: string | null,
  now: number = Date.now()
): RegistrationState {
  if (opensAt && now < new Date(opensAt).getTime()) return "before";
  if (closesAt && now > new Date(closesAt).getTime()) return "closed";
  return "open";
}

export type EventPhase = "upcoming" | "current" | "past";

/**
 * Lifecycle phase of a community event for the 3-tab board:
 *   * upcoming — not started yet (future start, or registration hasn't opened).
 *   * current  — happening now / open.
 *   * past     — ended (end date passed, or — for undated events — registration closed).
 * Dated events are driven by their start/end dates; undated announcements fall
 * back to the registration window.
 */
export function eventPhase(
  event: {
    startsAt: string | null;
    endsAt: string | null;
    registrationOpensAt: string | null;
    registrationClosesAt: string | null;
  },
  now: number = Date.now()
): EventPhase {
  const ends = event.endsAt ? new Date(event.endsAt).getTime() : null;
  const starts = event.startsAt ? new Date(event.startsAt).getTime() : null;

  if (ends !== null) {
    if (now > ends) return "past";
    if (starts !== null && now < starts) return "upcoming";
    return "current";
  }

  // No end date — let the registration window decide.
  const reg = registrationState(event.registrationOpensAt, event.registrationClosesAt, now);
  if (reg === "before") return "upcoming";
  if (reg === "closed") return "past";
  return "current";
}

export function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Smallest datetime-local the admin can pick, formatted for the native input
// (local time, no seconds/timezone suffix).
export function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
