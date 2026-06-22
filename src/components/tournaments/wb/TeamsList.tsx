// Collapsible list of registered teams. Each card shows the symbol + name and,
// when expanded, the players (with WG stats when validated). Shared by the user
// view and the admin manager; the optional `renderActions` adds per-team controls
// (admin edit/delete, or the captain's own edit/withdraw).

"use client";

import { useState } from "react";
import { TournamentTeam, TournamentTeamMember } from "@/types/tournament.types";

export function WbTeamName({
  team,
  className = "",
}: {
  team: Pick<TournamentTeam, "name" | "symbol" | "eliminated">;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <span aria-hidden className="text-base leading-none">
        {team.symbol ?? "🎮"}
      </span>
      <span
        className={`min-w-0 truncate font-semibold ${
          team.eliminated ? "text-zinc-500 line-through" : "text-zinc-100"
        }`}
      >
        {team.name}
      </span>
    </span>
  );
}

function MemberRow({ m }: { m: TournamentTeamMember }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
      <span className="flex min-w-0 items-center gap-1.5">
        {m.isReserve && (
          <span className="shrink-0 rounded bg-zinc-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-300">
            Res
          </span>
        )}
        <span className="min-w-0 truncate text-zinc-200">{m.playerName}</span>
      </span>
      {m.winrate != null && (
        <span className="shrink-0 tabular-nums text-zinc-500">{m.winrate.toFixed(1)}% WR</span>
      )}
    </li>
  );
}

function TeamCard({
  team,
  renderActions,
}: {
  team: TournamentTeam;
  renderActions?: (team: TournamentTeam) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
      >
        <div className="min-w-0 flex-1">
          <WbTeamName team={team} />
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {team.members.length} player{team.members.length === 1 ? "" : "s"}
            {team.groupLabel ? ` · Group ${team.groupLabel}` : ""}
            {team.locked ? " · closed" : ""}
          </p>
        </div>
        <span aria-hidden className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/10 px-4 py-3">
          {team.members.length === 0 ? (
            <p className="text-xs text-zinc-500">No players recorded.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {team.members.map((m) => (
                <MemberRow key={m.id} m={m} />
              ))}
            </ul>
          )}
          {renderActions && <div className="flex flex-wrap gap-2">{renderActions(team)}</div>}
        </div>
      )}
    </div>
  );
}

export default function TeamsList({
  teams,
  renderActions,
  emptyHint = "No teams registered yet.",
}: {
  teams: TournamentTeam[];
  renderActions?: (team: TournamentTeam) => React.ReactNode;
  emptyHint?: string;
}) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl bg-black/20 p-6 text-center text-sm text-zinc-400 ring-1 ring-white/10">
        {emptyHint}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {teams.map((t) => (
        <TeamCard key={t.id} team={t} renderActions={renderActions} />
      ))}
    </div>
  );
}
