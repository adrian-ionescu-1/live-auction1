// A modal form built from an event's registration fields. Used by the member to
// register ("Participate") and by the admin to add/edit a participant. Portaled,
// mobile-first. Returns the captured display name + field values.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BlitzRegion, RegistrationField } from "@/types/community-event.types";
import BlitzValidator, { ValidatedPlayer } from "@/components/community/BlitzValidator";

const inputClass =
  "w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

export default function RegistrationFormDialog({
  isOpen,
  title,
  description,
  fields,
  confirmLabel,
  busy,
  error,
  /** Show an editable display-name field (admin add/edit). Members use their name. */
  showNameField = false,
  initialName = "",
  initialValues,
  region = null,
  initialBlitz = null,
  requireConsent = false,
  onSubmit,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  fields: RegistrationField[];
  confirmLabel: string;
  busy: boolean;
  error?: string | null;
  showNameField?: boolean;
  initialName?: string;
  initialValues?: Record<string, string>;
  /** When set, the event requires validating a real Blitz account on this region. */
  region?: BlitzRegion | null;
  initialBlitz?: ValidatedPlayer | null;
  /** Member self-registration: require a "details correct + accept terms" tick. */
  requireConsent?: boolean;
  onSubmit: (result: {
    displayName: string;
    values: Record<string, string>;
    blitz: ValidatedPlayer | null;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState<ValidatedPlayer | null>(null);
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setValues(initialValues ? { ...initialValues } : {});
    setValidated(initialBlitz);
    setConsent(false);
    setTouched(false);
  }, [isOpen, initialName, initialValues, initialBlitz]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const blitzRequired = region !== null;
  const blitzMissing = blitzRequired && validated === null;
  const missingRequired = fields.some(
    (f) => f.required && !String(values[f.key] ?? "").trim()
  );
  // On Blitz events the validated in-game name is the identity, so the manual
  // name field is hidden and not required.
  const showName = showNameField && !blitzRequired;
  const nameMissing = showName && !name.trim();
  const consentMissing = requireConsent && !consent;
  const canSubmit = !missingRequired && !nameMissing && !blitzMissing && !consentMissing && !busy;

  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;
    const displayName = blitzRequired && validated ? validated.playerName : name.trim();
    onSubmit({ displayName, values, blitz: validated });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div className="my-4 w-full max-w-md min-w-0 rounded-3xl bg-zinc-950/95 p-5 ring-1 ring-white/10 shadow-2xl sm:p-6">
          <h3 className="text-lg font-extrabold text-zinc-100">{title}</h3>
          {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}

          <div className="mt-4 space-y-3">
            {blitzRequired && region && (
              <div className="min-w-0">
                <span className="mb-1.5 block text-sm font-semibold text-zinc-300">
                  Verify your in-game account{" "}
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {region}
                  </span>
                </span>
                <BlitzValidator region={region} value={validated} onChange={setValidated} />
                {touched && blitzMissing && (
                  <span className="mt-1 block text-xs font-semibold text-amber-200">
                    Search and select your account to continue.
                  </span>
                )}
              </div>
            )}

            {showName && (
              <label className="block min-w-0">
                <span className="block text-sm font-semibold text-zinc-300">
                  Display name <span className="text-red-300">*</span>
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Participant name"
                  maxLength={60}
                  className={`${inputClass} mt-1.5`}
                />
                {touched && nameMissing && (
                  <span className="mt-1 block text-xs font-semibold text-amber-200">
                    Required.
                  </span>
                )}
              </label>
            )}

            {fields.length === 0 && !showName && !blitzRequired && (
              <p className="text-sm text-zinc-400">This event has no fields to fill in.</p>
            )}

            {fields.map((f) => {
              const val = values[f.key] ?? "";
              const invalid = touched && f.required && !String(val).trim();
              return (
                <label key={f.key} className="block min-w-0">
                  <span className="block text-sm font-semibold text-zinc-300">
                    {f.label} {f.required && <span className="text-red-300">*</span>}
                  </span>
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    inputMode={f.type === "number" ? "numeric" : undefined}
                    value={val}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className={`${inputClass} mt-1.5`}
                  />
                  {invalid && (
                    <span className="mt-1 block text-xs font-semibold text-amber-200">
                      Required.
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {requireConsent && (
            <div className="mt-4 rounded-2xl bg-amber-400/10 p-3.5 ring-1 ring-amber-400/25">
              <p className="text-xs leading-relaxed text-amber-100/90">
                Double-check your details are correct and that this is your own account — the admin
                uses exactly what you submit here.
              </p>
              <label className="mt-2.5 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
                />
                <span className="text-sm font-semibold text-amber-50">
                  My details are correct and I agree to the event&apos;s terms and conditions.
                </span>
              </label>
              {touched && consentMissing && (
                <span className="mt-1 block text-xs font-semibold text-amber-200">
                  Please confirm to continue.
                </span>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>}

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
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
