// Section 1 of the admin tournaments page: create a FIFA-style tournament from a
// finished auction. Each bidder in that auction becomes a team (their won squad
// is the roster, the country pre-filled from the bidder's default). The admin can
// also start an empty tournament and add teams by hand.

"use client";

import { useEffect, useState } from "react";
import { EventsService } from "@/services/eventsService";
import { TournamentsService } from "@/services/tournamentsService";
import { AuctionEvent } from "@/types/event.types";

export default function CreateTournamentCard({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [finishedAuctions, setFinishedAuctions] = useState<AuctionEvent[]>([]);
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    EventsService.listEvents().then((all) =>
      setFinishedAuctions(all.filter((e) => e.status === "finished"))
    );
  }, []);

  // Default the name to the picked auction's name + a suffix, if still empty.
  const pickSource = (id: string) => {
    setSourceId(id);
    if (!name.trim()) {
      const ev = finishedAuctions.find((e) => e.id === id);
      if (ev) setName(`${ev.name} — Tournament`);
    }
  };

  const create = async () => {
    if (!name.trim()) {
      setError("Give the tournament a name");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    const res = await TournamentsService.createTournament(name.trim(), sourceId || null);
    setBusy(false);
    if (res.success) {
      setDone(
        sourceId
          ? "Tournament created with the bidders as teams. Assign countries and mix round 1 below."
          : "Empty tournament created. Add teams below."
      );
      setName("");
      setSourceId("");
      await onCreated();
    } else {
      setError(res.error ?? "Could not create the tournament");
    }
  };

  return (
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
      <h2 className="text-base font-extrabold text-zinc-100">Create a tournament</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Build a FIFA-style blitz tournament. Pick a finished auction to turn each bidder into a team
        with the squad they won.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-zinc-400">Tournament name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blitz World Cup"
            className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-zinc-400">Source auction (teams)</span>
          <select
            value={sourceId}
            onChange={(e) => pickSource(e.target.value)}
            className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          >
            <option value="" className="bg-zinc-900">
              No source (add teams manually)
            </option>
            {finishedAuctions.map((e) => (
              <option key={e.id} value={e.id} className="bg-zinc-900">
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
      {done && <p className="mt-3 text-xs text-emerald-300">{done}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={create}
        className="mt-4 rounded-2xl bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create tournament"}
      </button>
    </div>
  );
}
