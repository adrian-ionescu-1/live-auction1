// A deliberately heavy two-step guard for granting the Admin role. Admin gives a
// member full control of the dashboard (roles, bans, events), so a single click
// must never do it by accident. Step 1 is a big red danger card: the admin has
// to tick every risk checkbox AND type the member's exact name. Step 2 is a
// final "are you absolutely sure?" confirmation before the change is committed.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ACKNOWLEDGEMENTS = [
  "I understand this member will have full access to the admin dashboard.",
  "I understand they can change roles, ban members, and manage events.",
  "I accept the risks and take responsibility for this change.",
];

export default function GrantAdminDialog({
  memberName,
  isOpen,
  busy,
  onConfirm,
  onCancel,
}: {
  memberName: string;
  isOpen: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [checks, setChecks] = useState<boolean[]>(() => ACKNOWLEDGEMENTS.map(() => false));
  const [typed, setTyped] = useState("");
  // Only portal after mount so document.body exists (and to stay SSR-safe).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Reset every time the dialog (re)opens so a previous run never leaks through.
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setChecks(ACKNOWLEDGEMENTS.map(() => false));
      setTyped("");
    }
  }, [isOpen]);

  // Close on Escape, just like the other admin dialogs.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const allChecked = checks.every(Boolean);
  const nameMatches = typed.trim() === memberName.trim();
  const canContinue = allChecked && nameMatches && !busy;

  const toggle = (i: number) =>
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  // Portal to <body> so no transformed/animated ancestor (e.g. a fade-up row)
  // can become the containing block for this fixed overlay — that's what pushed
  // the card off-centre and under the navbar. On body it's truly viewport-fixed.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Grant Admin access"
    >
      {/* min-h-full + items-center keeps the card centred when it fits, but lets
          it scroll into view (never tucked under the navbar) when it's taller
          than the viewport. */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-zinc-950/95 ring-1 ring-red-500/30 shadow-2xl shadow-red-900/30">
        {/* Loud red danger header — present on both steps. */}
        <div className="flex items-center gap-3 border-b border-red-500/30 bg-red-500/15 px-6 py-4">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-2xl ring-1 ring-red-400/40"
          >
            ⚠
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">
              Danger — high-risk action
            </p>
            <h3 className="text-lg font-extrabold text-red-50">Grant Admin access</h3>
          </div>
        </div>

        {step === 1 ? (
          <div className="p-6">
            <p className="text-sm text-zinc-300">
              You are about to make{" "}
              <span className="font-bold text-red-200">{memberName}</span> an{" "}
              <span className="font-bold text-red-200">Admin</span>. Admins have full
              control over this dashboard and every member in it.
            </p>

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Acknowledge the risks</legend>
              {ACKNOWLEDGEMENTS.map((text, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/[0.07]"
                >
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() => toggle(i)}
                    disabled={busy}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-red-500"
                  />
                  <span className="text-sm text-zinc-200">{text}</span>
                </label>
              ))}
            </fieldset>

            <label className="mt-4 block">
              <span className="block text-xs font-semibold text-zinc-400">
                Type{" "}
                <span className="font-bold text-red-200">{memberName}</span> to confirm
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={memberName}
                autoFocus
                disabled={busy}
                className="mt-2 w-full rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:opacity-60"
              />
            </label>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canContinue}
                className="flex-1 rounded-2xl bg-red-500/20 px-4 py-3 text-sm font-bold text-red-100 ring-1 ring-red-400/30 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-zinc-300">
              Final confirmation. Are you{" "}
              <span className="font-bold text-red-200">absolutely sure</span> you want to
              grant <span className="font-bold text-red-200">Admin</span> to{" "}
              <span className="font-bold text-red-200">{memberName}</span>? This gives them
              complete control and can only be undone by another admin.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={busy}
                className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white ring-1 ring-red-400 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Granting…" : "Yes, grant Admin"}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
