// Create a WoT Blitz tournament (registration-based). The admin sets the title,
// team format, validation region (or none), description and the registration
// window. On success it routes to the Tournaments admin page where teams will
// register and the groups/bracket are run.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TournamentsService } from "@/services/tournamentsService";
import { TEAM_FORMATS } from "@/lib/teamFormats";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const inputClass =
  "w-full min-w-0 rounded-xl bg-black/30 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";
const selectClass =
  "w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-3 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-semibold text-zinc-300">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function CreateWbTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamFormatId, setTeamFormatId] = useState("3v3+1");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [regOpensAt, setRegOpensAt] = useState("");
  const [regClosesAt, setRegClosesAt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toIso = (local: string) => (local ? new Date(local).toISOString() : null);
  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    const res = await TournamentsService.createWbTournament({
      name: name.trim(),
      teamFormat: teamFormatId,
      region: region || null,
      description: description.trim() || null,
      startsAt: toIso(startsAt),
      registrationOpensAt: toIso(regOpensAt),
      registrationClosesAt: toIso(regClosesAt),
    });
    if (res.success) {
      router.push("/admin/tournaments");
    } else {
      setError(res.error ?? "Could not create the tournament");
      setSubmitting(false);
    }
  };

  return (
    <>
      <form
        className="min-w-0 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) setConfirmOpen(true);
        }}
      >
        <div className="min-w-0 space-y-5 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
          <Field label="Tournament title">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Blitz Cup"
              maxLength={120}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Team format" hint="How many players each team fields.">
              <select value={teamFormatId} onChange={(e) => setTeamFormatId(e.target.value)} className={selectClass}>
                {TEAM_FORMATS.map((f) => (
                  <option key={f.id} value={f.id} className="bg-zinc-900">
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Validation region" hint="Require players to validate a real account, or none.">
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectClass}>
                <option value="" className="bg-zinc-900">No validation</option>
                <option value="eu" className="bg-zinc-900">EU</option>
                <option value="na" className="bg-zinc-900">NA</option>
                <option value="asia" className="bg-zinc-900">ASIA</option>
              </select>
            </Field>
          </div>

          <Field label="Description" hint="Shown to members on the tournament card.">
            <textarea
              className={`${inputClass} min-h-[6rem] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rules, schedule, prizes…"
              maxLength={4000}
            />
          </Field>

          <Field label="Start date (optional)" hint="Informational.">
            <input type="datetime-local" className={inputClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Registration opens">
              <input type="datetime-local" className={inputClass} value={regOpensAt} onChange={(e) => setRegOpensAt(e.target.value)} />
            </Field>
            <Field label="Registration closes">
              <input type="datetime-local" className={inputClass} value={regClosesAt} onChange={(e) => setRegClosesAt(e.target.value)} />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-red-200">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-emerald-500/20 px-6 py-3.5 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create tournament"}
        </button>
      </form>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Create this tournament?"
        message={`"${name.trim()}" — a WoT Blitz ${
          TEAM_FORMATS.find((f) => f.id === teamFormatId)?.label ?? teamFormatId
        } tournament${region ? ` (${region.toUpperCase()} validation)` : ""}. It opens as a draft; publish it to start registration.`}
        tone="primary"
        confirmLabel="Create tournament"
        busy={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
