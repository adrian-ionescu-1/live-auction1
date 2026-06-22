// Admin Tournaments page. Two sections: "Create a tournament" (from a finished
// auction) and "Manage tournaments" (every tournament as a collapsible card with
// full edit access — teams, countries, mix, rounds, scores, podium, publish and
// archive). Users only ever see published/finished ones, read-only.

"use client";

import { useCallback, useEffect, useState } from "react";
import { TournamentsService } from "@/services/tournamentsService";
import { Tournament } from "@/types/tournament.types";
import CreateTournamentCard from "@/components/tournaments/admin/CreateTournamentCard";
import AdminTournamentCard from "@/components/tournaments/admin/AdminTournamentCard";
import AdminWbTournamentCard from "@/components/tournaments/wb/AdminWbTournamentCard";

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await TournamentsService.listTournaments();
    setTournaments(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="animate-fade-up space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
          Tournaments
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Run the post-auction competition: turn an auction&apos;s bidders into national teams, mix
          the fixtures, keep the scores and standings up to date, then crown a winner.
        </p>
      </div>

      <CreateTournamentCard onCreated={load} />

      <div>
        <h2 className="mb-3 text-base font-extrabold text-zinc-100">Manage tournaments</h2>
        {loading ? (
          <div className="h-28 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />
        ) : tournaments.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
            <p className="text-sm font-semibold text-zinc-300">No tournaments yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Create one above from a finished auction to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t) =>
              t.format === "wotblitz_bracket" ? (
                <AdminWbTournamentCard key={t.id} tournament={t} onChanged={load} />
              ) : (
                <AdminTournamentCard key={t.id} tournament={t} onChanged={load} />
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
