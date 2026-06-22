// Discord contact card: shows the owner's handle with a one-tap copy button.
// "Fastest for collaborations and anything else." Used on both contact surfaces.

"use client";

import { useState } from "react";
import { DISCORD_HANDLE } from "@/lib/contactOptions";

export default function DiscordCard() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DISCORD_HANDLE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the handle is shown anyway */
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/15 via-white/[0.04] to-transparent p-6 ring-1 ring-indigo-400/25">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-400/15 blur-3xl"
      />
      <div className="relative">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20 text-xl ring-1 ring-indigo-400/30">
          💬
        </span>
        <h3 className="mt-3 text-lg font-extrabold text-zinc-100">Reach me on Discord</h3>
        <p className="mt-1 text-sm text-zinc-400">
          The fastest way to reach me — for collaborations or anything else.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-xl bg-black/40 px-3 py-2 text-sm font-bold text-indigo-200 ring-1 ring-white/10">
            {DISCORD_HANDLE}
          </code>
          <button
            type="button"
            onClick={copy}
            className="rounded-xl bg-indigo-500/20 px-3 py-2 text-sm font-bold text-indigo-100 ring-1 ring-indigo-400/30 transition hover:bg-indigo-500/30 active:scale-[0.98]"
          >
            {copied ? "Copied ✓" : "Copy handle"}
          </button>
        </div>
      </div>
    </div>
  );
}
