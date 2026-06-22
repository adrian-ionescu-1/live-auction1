// Set the final podium (champion / runner-up / third). When the tournament is
// finished and a podium is set, the standings show a trophy card above the table.

"use client";

import { useState } from "react";
import { TournamentsService } from "@/services/tournamentsService";
import { Tournament, TournamentTeam } from "@/types/tournament.types";

function PodiumSelect({
  label,
  emoji,
  value,
  teams,
  onChange,
}: {
  label: string;
  emoji: string;
  value: string;
  teams: TournamentTeam[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-zinc-400">
        {emoji} {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
      >
        <option value="" className="bg-zinc-900">
          —
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id} className="bg-zinc-900">
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function PodiumEditor({
  tournament,
  teams,
  onChanged,
}: {
  tournament: Tournament;
  teams: TournamentTeam[];
  onChanged: () => Promise<void> | void;
}) {
  const [champion, setChampion] = useState(tournament.championTeamId ?? "");
  const [runnerUp, setRunnerUp] = useState(tournament.runnerUpTeamId ?? "");
  const [third, setThird] = useState(tournament.thirdTeamId ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    const res = await TournamentsService.setPodium(
      tournament.id,
      champion || null,
      runnerUp || null,
      third || null
    );
    setBusy(false);
    if (res.success) {
      setNotice("Podium saved.");
      await onChanged();
    } else {
      setNotice(res.error ?? "Could not save");
    }
  };

  return (
    <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
      <h4 className="text-sm font-extrabold text-zinc-100">🏆 Final podium</h4>
      <p className="mt-0.5 text-[11px] text-zinc-500">
        Pick the top three. Shown as a trophy card on the standings once set.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <PodiumSelect label="Champion" emoji="🥇" value={champion} teams={teams} onChange={setChampion} />
        <PodiumSelect label="Runner-up" emoji="🥈" value={runnerUp} teams={teams} onChange={setRunnerUp} />
        <PodiumSelect label="Third" emoji="🥉" value={third} teams={teams} onChange={setThird} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save podium"}
        </button>
        {notice && <span className="text-xs text-emerald-300">{notice}</span>}
      </div>
    </div>
  );
}
