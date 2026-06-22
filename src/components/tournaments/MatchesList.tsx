// Read-only matches list, grouped by round. Each match shows home vs away (with
// flags), the date/time, the score (or "vs" when unplayed) and the standout-player
// tags (💥 top damage, 💀 top kill). Tapping a team reveals its roster — the
// players that bidder won at the auction. Shared by the user view and the admin
// manager (preview). Mobile-first.

"use client";

import { useState } from "react";
import { fmtDateTime } from "@/components/admin/communityEventMeta";
import Flag from "@/components/community/Flag";
import TeamLabel from "@/components/tournaments/TeamLabel";
import { TournamentMatch, TournamentRound, TournamentTeam } from "@/types/tournament.types";

function TeamButton({
  team,
  expanded,
  onToggle,
  align = "left",
}: {
  team: TournamentTeam | undefined;
  expanded: boolean;
  onToggle: () => void;
  align?: "left" | "right";
}) {
  if (!team) return <span className="text-sm text-zinc-500">Unknown</span>;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
      title="Show roster"
    >
      <TeamLabel team={team} />
      <span
        aria-hidden
        className={`shrink-0 text-[10px] text-zinc-500 transition group-hover:text-zinc-300 ${
          expanded ? "rotate-180" : ""
        }`}
      >
        ▾
      </span>
    </button>
  );
}

function Roster({ team }: { team: TournamentTeam }) {
  return (
    <div className="mt-2 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-300">
        <TeamLabel team={team} /> <span className="text-zinc-500">· roster</span>
      </div>
      {team.players.length === 0 ? (
        <p className="text-xs text-zinc-500">No players recorded for this team.</p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {team.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs"
            >
              <span className="min-w-0 truncate text-zinc-200">{p.playerName}</span>
              {p.amount > 0 && (
                <span className="shrink-0 tabular-nums text-zinc-500">
                  ${p.amount.toLocaleString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tag({
  emoji,
  label,
  player,
  team,
}: {
  emoji: string;
  label: string;
  player: string | null;
  team: TournamentTeam | undefined;
}) {
  if (!player) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 ring-1 ring-white/10">
      <span aria-hidden title={label}>
        {emoji}
      </span>
      {team?.country && <Flag code={team.country} className="h-3 w-auto" />}
      <span className="min-w-0 truncate">{player}</span>
    </span>
  );
}

function MatchRow({
  match,
  teamsById,
}: {
  match: TournamentMatch;
  teamsById: Map<string, TournamentTeam>;
}) {
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const home = teamsById.get(match.homeTeamId);
  const away = teamsById.get(match.awayTeamId);
  const played = match.status === "played" && match.homeScore != null && match.awayScore != null;

  const toggle = (id: string | undefined) => {
    if (!id) return;
    setOpenTeam((cur) => (cur === id ? null : id));
  };

  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 justify-end">
          <TeamButton team={home} expanded={openTeam === match.homeTeamId} onToggle={() => toggle(match.homeTeamId)} align="right" />
        </div>
        <div className="shrink-0 px-1 text-center">
          {played ? (
            <span className="rounded-lg bg-black/40 px-2.5 py-1 text-sm font-extrabold tabular-nums text-zinc-100 ring-1 ring-white/10">
              {match.homeScore} <span className="text-zinc-500">:</span> {match.awayScore}
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">vs</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 justify-start">
          <TeamButton team={away} expanded={openTeam === match.awayTeamId} onToggle={() => toggle(match.awayTeamId)} />
        </div>
      </div>

      {(match.scheduledAt || match.topDamagePlayer || match.topKillPlayer) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {match.scheduledAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-zinc-400 ring-1 ring-white/10">
              🗓️ {fmtDateTime(match.scheduledAt)}
            </span>
          )}
          <Tag emoji="💥" label="Top damage" player={match.topDamagePlayer} team={match.topDamageTeamId ? teamsById.get(match.topDamageTeamId) : undefined} />
          <Tag emoji="💀" label="Top kills" player={match.topKillPlayer} team={match.topKillTeamId ? teamsById.get(match.topKillTeamId) : undefined} />
        </div>
      )}

      {openTeam && teamsById.get(openTeam) && <Roster team={teamsById.get(openTeam)!} />}
    </div>
  );
}

export default function MatchesList({
  rounds,
  matches,
  teams,
}: {
  rounds: TournamentRound[];
  matches: TournamentMatch[];
  teams: TournamentTeam[];
}) {
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl bg-black/20 p-6 text-center text-sm text-zinc-400 ring-1 ring-white/10">
        No matches scheduled yet.
      </div>
    );
  }

  // Group matches by round (rounds in order, then a fallback bucket).
  const byRound = new Map<string, TournamentMatch[]>();
  const unscheduled: TournamentMatch[] = [];
  for (const m of matches) {
    if (m.roundId) {
      const list = byRound.get(m.roundId) ?? [];
      list.push(m);
      byRound.set(m.roundId, list);
    } else {
      unscheduled.push(m);
    }
  }

  const groups: { key: string; title: string; subtitle: string | null; list: TournamentMatch[] }[] =
    [];
  for (const r of rounds) {
    const list = byRound.get(r.id);
    if (list && list.length) {
      groups.push({
        key: r.id,
        title: r.name,
        subtitle: r.scheduledAt ? fmtDateTime(r.scheduledAt) : null,
        list,
      });
    }
  }
  if (unscheduled.length) {
    groups.push({ key: "none", title: "Other matches", subtitle: null, list: unscheduled });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-extrabold text-zinc-100">{g.title}</h4>
            {g.subtitle && <span className="text-[11px] text-zinc-500">🗓️ {g.subtitle}</span>}
          </div>
          <div className="space-y-2">
            {g.list.map((m) => (
              <MatchRow key={m.id} match={m} teamsById={teamsById} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
