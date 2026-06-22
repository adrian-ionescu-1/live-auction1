// A team's flag + name, shown everywhere a team appears. The country falls back
// to a neutral globe when no flag is set. Reused by standings, matches and the
// admin editors so the look stays consistent.

"use client";

import Flag from "@/components/community/Flag";
import { isKnownCountry } from "@/lib/flags";
import { TournamentTeam } from "@/types/tournament.types";

export default function TeamLabel({
  team,
  flagClassName = "h-4 w-auto",
  className = "",
  muted = false,
}: {
  team: Pick<TournamentTeam, "name" | "country" | "eliminated">;
  flagClassName?: string;
  className?: string;
  /** Dim eliminated teams. */
  muted?: boolean;
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {isKnownCountry(team.country) ? (
        <Flag code={team.country} className={flagClassName} />
      ) : (
        <span aria-hidden className="text-sm">
          🏳️
        </span>
      )}
      <span
        className={`min-w-0 truncate font-semibold ${
          muted && team.eliminated ? "text-zinc-500 line-through" : "text-zinc-100"
        }`}
      >
        {team.name}
      </span>
    </span>
  );
}
