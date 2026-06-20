// Shared role display metadata + the list of roles an admin can assign.
// Used by the admin dashboard, the bidders list and the member action popover.

export type RoleMeta = { label: string; chip: string };

export const ROLE_META: Record<string, RoleMeta> = {
  admin: { label: "Admin", chip: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/30" },
  bidder: { label: "Bidder", chip: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30" },
  prime: { label: "Prime", chip: "bg-cyan-400/15 text-cyan-200 ring-cyan-400/30" },
  guest: { label: "Guest", chip: "bg-amber-400/15 text-amber-200 ring-amber-400/30" },
  excluded: { label: "Excluded", chip: "bg-red-500/15 text-red-200 ring-red-400/30" },
};

// Order roles appear in the dashboard.
export const ROLE_ORDER = ["admin", "bidder", "prime", "guest", "excluded"];

// Roles an admin can pick in the action popover.
export const ASSIGNABLE_ROLES = ["guest", "bidder", "prime", "admin", "excluded"];

export function roleMeta(role: string): RoleMeta {
  return (
    ROLE_META[role.toLowerCase()] ?? {
      label: role.charAt(0).toUpperCase() + role.slice(1),
      chip: "bg-white/10 text-zinc-200 ring-white/15",
    }
  );
}
