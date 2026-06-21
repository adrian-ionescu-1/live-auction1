// Shared role display metadata + the list of roles an admin can assign.
// Used by the admin dashboard, the bidders list and the member action popover.

export type RoleMeta = { label: string; chip: string };

export const ROLE_META: Record<string, RoleMeta> = {
  admin: { label: "Admin", chip: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/30" },
  bidder: { label: "Bidder", chip: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30" },
  wotblitz: { label: "WoT Blitz", chip: "bg-amber-500/15 text-amber-200 ring-amber-400/30" },
  guest: { label: "Guest", chip: "bg-sky-400/15 text-sky-200 ring-sky-400/30" },
  excluded: { label: "Excluded", chip: "bg-red-500/15 text-red-200 ring-red-400/30" },
};

// Order roles appear in the dashboard.
export const ROLE_ORDER = ["admin", "bidder", "wotblitz", "guest", "excluded"];

// Roles an admin can pick in the action popover.
export const ASSIGNABLE_ROLES = ["guest", "wotblitz", "bidder", "admin", "excluded"];

export function roleMeta(role: string): RoleMeta {
  return (
    ROLE_META[role.toLowerCase()] ?? {
      label: role.charAt(0).toUpperCase() + role.slice(1),
      chip: "bg-white/10 text-zinc-200 ring-white/15",
    }
  );
}

// The single "primary" role to show for a member who may hold several. Mirrors
// the SQL primary_role() precedence: a locked account dominates, otherwise the
// most-privileged content role wins.
const ROLE_PRECEDENCE = ["excluded", "admin", "bidder", "wotblitz", "guest"];

export function primaryRole(roles: string[]): string {
  const lc = roles.map((r) => r.toLowerCase());
  for (const r of ROLE_PRECEDENCE) {
    if (lc.includes(r)) return r;
  }
  return lc[0] ?? "guest";
}
