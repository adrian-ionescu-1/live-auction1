// The member-facing tournaments view (read-only, informative). A 3-tab board
// (Upcoming / Ongoing / Ended) of collapsible cards; expanding one loads its
// teams/rounds/matches and shows two sub-tabs: Standings and Matches. Mirrors the
// community EventsBoard look. Admins update everything; members only watch.

"use client";

import { useEffect, useMemo, useState } from "react";
import { TournamentsService, TournamentDetail } from "@/services/tournamentsService";
import { Tournament, TournamentPhase } from "@/types/tournament.types";
import { tournamentPhase } from "@/components/admin/tournamentMeta";
import { fmtDateTime } from "@/components/admin/communityEventMeta";
import { computeStandings } from "@/lib/standings";
import StandingsTable from "@/components/tournaments/StandingsTable";
import MatchesList from "@/components/tournaments/MatchesList";

const TABS: { id: TournamentPhase; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "current", label: "Ongoing" },
  { id: "past", label: "Ended" },
];

function PhaseBadge({ phase }: { phase: TournamentPhase }) {
  if (phase === "current") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-400/25">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" /> Live now
      </span>
    );
  }
  if (phase === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/25">
        ✓ Opening soon
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-500/15 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
      Finished
    </span>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<"standings" | "matches">("standings");
  const phase = tournamentPhase(tournament);

  useEffect(() => {
    if (!open || detail) return;
    let cancelled = false;
    setLoading(true);
    TournamentsService.loadDetail(tournament.id).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, detail, tournament.id]);

  const standings = useMemo(
    () => (detail ? computeStandings(detail.teams, detail.matches) : []),
    [detail]
  );

  const podium = useMemo(() => {
    if (!detail || tournament.status !== "finished") return undefined;
    const byId = new Map(detail.teams.map((t) => [t.id, t]));
    return {
      champion: tournament.championTeamId ? byId.get(tournament.championTeamId) ?? null : null,
      runnerUp: tournament.runnerUpTeamId ? byId.get(tournament.runnerUpTeamId) ?? null : null,
      third: tournament.thirdTeamId ? byId.get(tournament.thirdTeamId) ?? null : null,
    };
  }, [detail, tournament]);

  return (
    <div className="min-w-0 animate-fade-up rounded-3xl bg-white/5 ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="truncate text-base font-extrabold text-zinc-100">{tournament.name}</span>
          <PhaseBadge phase={phase} />
        </div>
        <span aria-hidden className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          {tournament.startsAt && (
            <p className="mb-3 text-xs text-zinc-500">🗓️ Starts {fmtDateTime(tournament.startsAt)}</p>
          )}

          {/* Sub-tabs: Standings / Matches */}
          <div className="mb-4 inline-flex rounded-2xl bg-black/30 p-1 ring-1 ring-white/10">
            {(["standings", "matches"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubTab(id)}
                aria-current={subTab === id ? "page" : undefined}
                className={`rounded-xl px-4 py-1.5 text-sm font-bold capitalize transition ${
                  subTab === id
                    ? "bg-white/10 text-zinc-100 ring-1 ring-white/15"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {id}
              </button>
            ))}
          </div>

          {loading || !detail ? (
            <div className="h-28 animate-pulse rounded-2xl bg-black/20" />
          ) : subTab === "standings" ? (
            <StandingsTable standings={standings} podium={podium} />
          ) : (
            <MatchesList rounds={detail.rounds} matches={detail.matches} teams={detail.teams} />
          )}
        </div>
      )}
    </div>
  );
}

export default function TournamentsView() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    TournamentsService.listVisibleTournaments().then((list) => {
      setTournaments(list);
      setLoading(false);
    });
  }, []);

  const grouped = useMemo(() => {
    const g: Record<TournamentPhase, Tournament[]> = { upcoming: [], current: [], past: [] };
    for (const t of tournaments) g[tournamentPhase(t)].push(t);
    return g;
  }, [tournaments]);

  const [tab, setTab] = useState<TournamentPhase>("current");
  useEffect(() => {
    // Land on the most relevant non-empty tab once data arrives.
    if (grouped.current.length) setTab("current");
    else if (grouped.upcoming.length) setTab("upcoming");
    else if (grouped.past.length) setTab("past");
  }, [grouped]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />;
  }

  const list = grouped[tab];

  return (
    <div className="min-w-0">
      <div className="mb-1">
        <h2 className="text-lg font-extrabold text-zinc-100">Tournaments</h2>
        <p className="text-sm text-zinc-400">
          Standings and fixtures for the post-auction competitions. Admins keep the scores up to
          date.
        </p>
      </div>

      <nav aria-label="Tournaments by phase" className="mt-4">
        <div className="overflow-x-auto rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-fit gap-1.5">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
                    active
                      ? "bg-white/10 text-zinc-100 ring-1 ring-white/15"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ring-1 ${
                      active
                        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
                        : "bg-white/5 text-zinc-400 ring-white/10"
                    }`}
                  >
                    {grouped[t.id].length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-4 space-y-4">
        {list.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-8 text-center ring-1 ring-white/10">
            <p className="text-sm font-semibold text-zinc-300">
              {tab === "upcoming"
                ? "Nothing upcoming"
                : tab === "current"
                  ? "No tournaments running right now"
                  : "Nothing here yet"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Tournaments appear here once an admin opens one.
            </p>
          </div>
        ) : (
          list.map((t) => <TournamentCard key={t.id} tournament={t} />)
        )}
      </div>
    </div>
  );
}
