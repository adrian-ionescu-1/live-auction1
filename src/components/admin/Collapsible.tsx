// A collapsible category section: a header (left content + count + chevron) that
// expands/collapses its children. Used for the role groups (dashboard) and the
// online/offline/banned groups (bidders list).

"use client";

import { ReactNode, useState } from "react";

export default function Collapsible({
  header,
  count,
  defaultOpen = false,
  children,
}: {
  header: ReactNode;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:px-5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">{header}</div>
        <span className="shrink-0 rounded-full bg-black/30 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 tabular-nums">
          {count}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 sm:px-5">
          {count === 0 ? (
            <p className="rounded-2xl bg-black/20 px-3 py-4 text-center text-xs text-zinc-500 ring-1 ring-white/10">
              Nobody here yet.
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
