// The WoT Blitz onboarding card on the Welcome page. Two states:
//   * action (guest, not consented) — checkbox + button; accepting promotes the
//     guest to the 'wotblitz' role server-side.
//   * informational (already consented) — a calm confirmation, no action.
// Mobile-first.

"use client";

import { useState } from "react";
import { AccountService } from "@/services/accountService";

export default function WotBlitzConsentCard({
  consented,
  onConsented,
}: {
  /** When true, the member already consented — render the informational state. */
  consented: boolean;
  onConsented: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    setError(null);
    const res = await AccountService.consentWotBlitz();
    if (res.success) {
      onConsented();
    } else {
      setError(res.error ?? "Could not continue. Please try again.");
      setBusy(false);
    }
  };

  // ── Informational state (already in) ───────────────────────────────────────
  if (consented) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-cyan-500/10 p-6 ring-1 ring-emerald-400/30 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-xl text-emerald-200 ring-1 ring-emerald-400/30">
            ✓
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-300/30">
              WoT Blitz · Joined
            </span>
            <h2 className="mt-3 text-lg font-extrabold text-emerald-50 sm:text-xl">
              You&apos;re in for World of Tanks Blitz
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/80">
              Consent given and the terms accepted — you&apos;re signed up for WoT Blitz events.
              Manage your in-game profile from the{" "}
              <span className="font-semibold text-emerald-100">Profile</span> tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Action state (guest, not consented yet) ────────────────────────────────
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-orange-500/10 p-6 ring-1 ring-amber-400/30 shadow-[0_0_40px_-12px_rgba(251,191,36,0.35)] sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl"
      />

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-100 ring-1 ring-amber-300/30">
          <span aria-hidden>🎮</span> WoT Blitz
        </span>

        <h2 className="mt-4 text-xl font-extrabold tracking-tight text-amber-50 sm:text-2xl">
          Here for World of Tanks Blitz?
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-amber-100/80">
          Confirm you connected for WoT Blitz to unlock everything: events, tournaments and your
          personal in-game profile linked straight from the game. You can always link or change
          your account afterwards.
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-black/25 p-4 ring-1 ring-amber-300/20 transition hover:bg-black/30">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
          />
          <span className="text-sm font-semibold text-amber-50">
            Yes, I connected for World of Tanks Blitz and want to take part in its events.
          </span>
        </label>

        {error && <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>}

        <button
          type="button"
          onClick={accept}
          disabled={!agreed || busy}
          className="mt-5 w-full rounded-2xl bg-amber-400/90 px-6 py-3.5 text-sm font-extrabold text-amber-950 shadow-lg transition hover:bg-amber-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Setting you up…" : "Continue to WoT Blitz →"}
        </button>
      </div>
    </div>
  );
}
