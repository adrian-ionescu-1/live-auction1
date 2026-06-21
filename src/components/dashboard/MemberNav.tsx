// The member dashboard navigation: a row of section tabs (horizontally
// scrollable on small screens), each with an active state and an optional red
// notification dot. Pure UI — the parent owns the active section + data.

"use client";

export interface MemberNavItem {
  id: string;
  label: string;
  /** Show a small red notification dot (e.g. a freshly-opened auction/event). */
  dot?: boolean;
}

export default function MemberNav({
  items,
  active,
  onSelect,
}: {
  items: MemberNavItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Dashboard sections">
      {/* The pill spans the full card width (like the profile card). Inside, the
          tabs are a w-fit group with mx-auto, so they stay centered when there's
          room and the pill scrolls them when a member has enough tabs to
          overflow the row. */}
      <div className="overflow-x-auto rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-fit gap-1.5">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
                isActive
                  ? "bg-white/10 text-zinc-100 ring-1 ring-white/15"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
            >
              {item.label}
              {item.dot && (
                <span
                  aria-label="New"
                  className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-zinc-950" />
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
