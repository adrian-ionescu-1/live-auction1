// Admin editor for a tournament's schedule: the "Mix" generator for round 1,
// rounds with a date/time, and the matches inside each round (create, enter
// scores, tag the top-damage / top-kill player, reschedule, delete). Standings
// recompute from played matches automatically.

"use client";

import { useMemo, useState } from "react";
import { TournamentsService } from "@/services/tournamentsService";
import {
  TournamentMatch,
  TournamentRound,
  TournamentTeam,
} from "@/types/tournament.types";
import { fmtDateTime, localInputValue } from "@/components/admin/communityEventMeta";
import TeamLabel from "@/components/tournaments/TeamLabel";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";
import ConfirmByNameDialog from "@/components/admin/ConfirmByNameDialog";

// datetime-local input <-> ISO. Empty string clears the value.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  return localInputValue(new Date(iso));
}
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

// A standout-player tag is one player on either side, or "none". Encoded as
// "teamId::playerName" so the team flag can be shown next to it.
function encodeTag(teamId: string | null, player: string | null): string {
  if (!teamId || !player) return "";
  return `${teamId}::${player}`;
}
function decodeTag(value: string): { teamId: string | null; player: string | null } {
  if (!value) return { teamId: null, player: null };
  const idx = value.indexOf("::");
  if (idx === -1) return { teamId: null, player: null };
  return { teamId: value.slice(0, idx), player: value.slice(idx + 2) };
}

function PlayerTagSelect({
  label,
  emoji,
  home,
  away,
  value,
  onChange,
}: {
  label: string;
  emoji: string;
  home: TournamentTeam | undefined;
  away: TournamentTeam | undefined;
  value: string;
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
          None
        </option>
        {[home, away].filter(Boolean).map((t) => (
          <optgroup key={t!.id} label={t!.name} className="bg-zinc-900">
            {t!.players.map((p) => (
              <option key={p.id} value={encodeTag(t!.id, p.playerName)} className="bg-zinc-900">
                {p.playerName}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function MatchRow({
  match,
  teamsById,
  onChanged,
}: {
  match: TournamentMatch;
  teamsById: Map<string, TournamentTeam>;
  onChanged: () => Promise<void> | void;
}) {
  const home = match.homeTeamId ? teamsById.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? teamsById.get(match.awayTeamId) : undefined;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scheduledAt, setScheduledAt] = useState(toLocalInput(match.scheduledAt));
  const [homeScore, setHomeScore] = useState(match.homeScore != null ? String(match.homeScore) : "");
  const [awayScore, setAwayScore] = useState(match.awayScore != null ? String(match.awayScore) : "");
  const [topDamage, setTopDamage] = useState(encodeTag(match.topDamageTeamId, match.topDamagePlayer));
  const [topKill, setTopKill] = useState(encodeTag(match.topKillTeamId, match.topKillPlayer));

  const played = match.status === "played" && match.homeScore != null && match.awayScore != null;

  const save = async () => {
    setBusy(true);
    setError(null);
    const dmg = decodeTag(topDamage);
    const kill = decodeTag(topKill);
    const res = await TournamentsService.updateMatch({
      matchId: match.id,
      scheduledAt: fromLocalInput(scheduledAt),
      homeScore: homeScore === "" ? null : Number(homeScore),
      awayScore: awayScore === "" ? null : Number(awayScore),
      topDamagePlayer: dmg.player,
      topDamageTeamId: dmg.teamId,
      topKillPlayer: kill.player,
      topKillTeamId: kill.teamId,
    });
    setBusy(false);
    if (res.success) {
      setEditing(false);
      await onChanged();
    } else {
      setError(res.error ?? "Could not save");
    }
  };

  const remove = async () => {
    setBusy(true);
    const res = await TournamentsService.deleteMatch(match.id);
    setBusy(false);
    setConfirmDelete(false);
    if (res.success) await onChanged();
    else setError(res.error ?? "Could not delete");
  };

  return (
    <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-end">
          {home ? <TeamLabel team={home} /> : <span className="text-sm text-zinc-500">?</span>}
        </div>
        <div className="shrink-0 px-1">
          {played ? (
            <span className="rounded-lg bg-black/40 px-2 py-0.5 text-sm font-extrabold tabular-nums text-zinc-100 ring-1 ring-white/10">
              {match.homeScore}:{match.awayScore}
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase text-zinc-500">vs</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-start">
          {away ? <TeamLabel team={away} /> : <span className="text-sm text-zinc-500">?</span>}
        </div>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {match.scheduledAt && !editing && (
        <p className="mt-1.5 text-center text-[11px] text-zinc-500">🗓️ {fmtDateTime(match.scheduledAt)}</p>
      )}

      {editing && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-xs font-semibold text-zinc-400">{home?.name ?? "Home"} score</span>
              <input
                type="number"
                inputMode="numeric"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-zinc-400">{away?.name ?? "Away"} score</span>
              <input
                type="number"
                inputMode="numeric"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
          </div>

          <PlayerTagSelect label="Top damage" emoji="💥" home={home} away={away} value={topDamage} onChange={setTopDamage} />
          <PlayerTagSelect label="Top kills" emoji="💀" home={home} away={away} value={topKill} onChange={setTopKill} />

          <label className="block">
            <span className="block text-xs font-semibold text-zinc-400">Date &amp; time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 [color-scheme:dark]"
            />
          </label>

          <p className="text-[11px] text-zinc-500">
            Leave both scores empty to keep the match unplayed. Entering both marks it played and
            updates the standings.
          </p>
          {error && <p className="text-xs text-red-300">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
            >
              Delete match
            </button>
          </div>
        </div>
      )}

      <ConfirmActionDialog
        isOpen={confirmDelete}
        title="Delete match"
        description="Remove this match? Any score it contributed leaves the standings."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function AddMatchControl({
  tournamentId,
  roundId,
  teams,
  onChanged,
}: {
  tournamentId: string;
  roundId: string;
  teams: TournamentTeam[];
  onChanged: () => Promise<void> | void;
}) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!home || !away || home === away) {
      setError("Pick two different teams");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await TournamentsService.createMatch(tournamentId, roundId, home, away, null);
    setBusy(false);
    if (res.success) {
      setHome("");
      setAway("");
      await onChanged();
    } else {
      setError(res.error ?? "Could not add match");
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          <option value="" className="bg-zinc-900">Home team…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id} className="bg-zinc-900">{t.name}</option>
          ))}
        </select>
        <span className="text-center text-xs font-bold text-zinc-500">vs</span>
        <select
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          <option value="" className="bg-zinc-900">Away team…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id} className="bg-zinc-900">{t.name}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={add}
          className="shrink-0 rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {busy ? "Adding…" : "+ Match"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function RoundBlock({
  round,
  matches,
  teams,
  teamsById,
  onChanged,
}: {
  round: TournamentRound;
  matches: TournamentMatch[];
  teams: TournamentTeam[];
  teamsById: Map<string, TournamentTeam>;
  onChanged: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(round.name);
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(round.scheduledAt));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveRound = async () => {
    setBusy(true);
    const res = await TournamentsService.updateRound(round.id, name, fromLocalInput(scheduledAt));
    setBusy(false);
    if (res.success) {
      setEditing(false);
      await onChanged();
    }
  };

  const removeRound = async () => {
    setBusy(true);
    const res = await TournamentsService.deleteRound(round.id);
    setBusy(false);
    setConfirmDelete(false);
    if (res.success) await onChanged();
  };

  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-extrabold text-zinc-100">{round.name}</h4>
          {round.scheduledAt && (
            <p className="text-[11px] text-zinc-500">🗓️ {fmtDateTime(round.scheduledAt)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <label className="block">
            <span className="block text-xs font-semibold text-zinc-400">Round name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-zinc-400">Date &amp; time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 [color-scheme:dark]"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={saveRound}
              className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save round"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
            >
              Delete round
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} teamsById={teamsById} onChanged={onChanged} />
        ))}
        <AddMatchControl tournamentId={round.tournamentId} roundId={round.id} teams={teams} onChanged={onChanged} />
      </div>

      <ConfirmActionDialog
        isOpen={confirmDelete}
        title="Delete round"
        description={`Delete "${round.name}" and all its matches?`}
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={removeRound}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function MatchesEditor({
  tournamentId,
  tournamentName,
  teams,
  rounds,
  matches,
  onChanged,
}: {
  tournamentId: string;
  tournamentName: string;
  teams: TournamentTeam[];
  rounds: TournamentRound[];
  matches: TournamentMatch[];
  onChanged: () => Promise<void> | void;
}) {
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const [mixOpen, setMixOpen] = useState(false);
  const [mixBusy, setMixBusy] = useState(false);
  const [addingRound, setAddingRound] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundBusy, setRoundBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeTeams = teams.filter((t) => !t.eliminated);

  const matchesByRound = useMemo(() => {
    const m = new Map<string, TournamentMatch[]>();
    for (const match of matches) {
      if (!match.roundId) continue;
      const list = m.get(match.roundId) ?? [];
      list.push(match);
      m.set(match.roundId, list);
    }
    return m;
  }, [matches]);

  const doMix = async () => {
    setMixBusy(true);
    setNotice(null);
    const res = await TournamentsService.mixRound(tournamentId);
    setMixBusy(false);
    setMixOpen(false);
    if (res.success) {
      setNotice(`Round 1 created with ${res.matches} match${res.matches === 1 ? "" : "es"}.`);
      await onChanged();
    } else {
      setNotice(res.error ?? "Could not mix");
    }
  };

  const addRound = async () => {
    const name = roundName.trim() || `Round ${rounds.length + 1}`;
    setRoundBusy(true);
    const res = await TournamentsService.createRound(tournamentId, name, null);
    setRoundBusy(false);
    if (res.success) {
      setRoundName("");
      setAddingRound(false);
      await onChanged();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMixOpen(true)}
          disabled={activeTeams.length < 2}
          className="rounded-xl bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-200 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25 disabled:opacity-50"
          title={activeTeams.length < 2 ? "Need at least two active teams" : "Shuffle teams into round 1"}
        >
          🎲 Mix round 1
        </button>
        <button
          type="button"
          onClick={() => setAddingRound((a) => !a)}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          + Add round
        </button>
      </div>

      {notice && <p className="text-xs text-emerald-300">{notice}</p>}

      {addingRound && (
        <div className="flex flex-col gap-2 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10 sm:flex-row">
          <input
            value={roundName}
            onChange={(e) => setRoundName(e.target.value)}
            placeholder={`Round ${rounds.length + 1} (e.g. Quarterfinal)`}
            className="min-w-0 flex-1 rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
          <button
            type="button"
            disabled={roundBusy}
            onClick={addRound}
            className="shrink-0 rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {roundBusy ? "Adding…" : "Create round"}
          </button>
        </div>
      )}

      {rounds.length === 0 ? (
        <p className="rounded-2xl bg-black/20 p-4 text-center text-sm text-zinc-400 ring-1 ring-white/10">
          No rounds yet. Use “Mix round 1” to auto-generate the first fixtures, or add a round
          manually.
        </p>
      ) : (
        <div className="space-y-3">
          {rounds.map((r) => (
            <RoundBlock
              key={r.id}
              round={r}
              matches={matchesByRound.get(r.id) ?? []}
              teams={teams}
              teamsById={teamsById}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      {/* Mix is high-impact (it rebuilds round 1) — type the name to confirm. */}
      <ConfirmByNameDialog
        eventName={tournamentName}
        title="Mix round 1"
        tone="primary"
        confirmLabel="Mix teams"
        description={
          <>
            This shuffles the {activeTeams.length} active teams into fresh round-1 fixtures,
            replacing any existing round-1 matches.
          </>
        }
        isOpen={mixOpen}
        busy={mixBusy}
        onConfirm={doMix}
        onCancel={() => setMixOpen(false)}
      />
    </div>
  );
}
