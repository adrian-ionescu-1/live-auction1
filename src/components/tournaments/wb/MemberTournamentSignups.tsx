// WoT Blitz tournaments open for team sign-up, surfaced in the member's Events
// tab (alongside community events). Shows only published tournaments still in the
// registration stage, with an open window, that target one of the member's
// roles. Each renders the full registration experience (register / edit /
// withdraw a team) via WbTournamentView. The groups/bracket live on the
// Tournaments tab; here it's purely about signing up.

"use client";

import { useEffect, useState } from "react";
import { TournamentsService } from "@/services/tournamentsService";
import { Tournament } from "@/types/tournament.types";
import WbTournamentView from "@/components/tournaments/wb/WbTournamentView";

export default function MemberTournamentSignups({
  roles,
  myProfileId,
}: {
  roles: string[];
  myProfileId: string | null;
}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lc = roles.map((r) => r.toLowerCase());
    const isAdmin = lc.includes("admin");
    TournamentsService.listVisibleTournaments().then((list) => {
      const now = Date.now();
      setTournaments(
        list.filter(
          (t) =>
            t.format === "wotblitz_bracket" &&
            t.status === "published" &&
            (t.stage ?? "registration") === "registration" &&
            (isAdmin || t.visibleRoles.length === 0 || t.visibleRoles.some((r) => lc.includes(r))) &&
            (!t.registrationOpensAt || now >= new Date(t.registrationOpensAt).getTime()) &&
            (!t.registrationClosesAt || now <= new Date(t.registrationClosesAt).getTime())
        )
      );
      setLoading(false);
    });
  }, [roles]);

  if (loading || tournaments.length === 0) return null;

  return (
    <section className="mt-8 animate-fade-up sm:mt-10">
      <h2 className="text-lg font-extrabold text-zinc-100 sm:text-xl">Tournament sign-ups</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Register your team while sign-ups are open. Follow the groups and bracket in the Tournaments
        tab.
      </p>

      <div className="mt-4 space-y-4">
        {tournaments.map((t) => (
          <div key={t.id} className="min-w-0 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:p-5">
            <h3 className="mb-3 text-base font-extrabold text-zinc-100">{t.name}</h3>
            <WbTournamentView tournament={t} myProfileId={myProfileId} />
          </div>
        ))}
      </div>
    </section>
  );
}
