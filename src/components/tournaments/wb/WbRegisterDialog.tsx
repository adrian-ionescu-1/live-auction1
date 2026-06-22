// Register (or edit) a team for a WoT Blitz tournament. The captain types a team
// name, picks a symbol, and fills the player slots required by the format
// (starters mandatory, reserves optional). When the tournament has a region the
// players are validated against the Wargaming API via BlitzValidator; otherwise
// plain names are entered. Portaled, mobile-first.

"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BlitzRegion } from "@/types/community-event.types";
import { Tournament, TournamentTeam } from "@/types/tournament.types";
import { teamFormat } from "@/lib/teamFormats";
import { WbMemberInput } from "@/services/tournamentsService";
import BlitzValidator, { ValidatedPlayer } from "@/components/community/BlitzValidator";
import SymbolPicker from "@/components/tournaments/wb/SymbolPicker";

interface Slot {
  name: string;
  accountId: number | null;
  winrate: number | null;
  battles: number | null;
  avgDamage: number | null;
}

const EMPTY: Slot = { name: "", accountId: null, winrate: null, battles: null, avgDamage: null };

function fromValidated(p: ValidatedPlayer): Slot {
  return {
    name: p.playerName,
    accountId: p.accountId,
    winrate: p.stats.winrate,
    battles: p.stats.battles,
    avgDamage: p.stats.avgDamage,
  };
}
function toValidated(s: Slot): ValidatedPlayer | null {
  if (s.accountId == null) return null;
  return {
    accountId: s.accountId,
    playerName: s.name,
    stats: {
      winrate: s.winrate ?? 0,
      battles: s.battles ?? 0,
      avgDamage: s.avgDamage ?? 0,
    },
  };
}

const inputClass =
  "w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

export default function WbRegisterDialog({
  isOpen,
  tournament,
  initialTeam = null,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  isOpen: boolean;
  tournament: Tournament;
  initialTeam?: TournamentTeam | null;
  busy: boolean;
  error?: string | null;
  onSubmit: (result: { name: string; symbol: string | null; members: WbMemberInput[] }) => void;
  onCancel: () => void;
}) {
  const fmt = teamFormat(tournament.teamFormat);
  const region = (tournament.region as BlitzRegion | null) ?? null;
  const starters = fmt?.starters ?? 1;
  const reserves = fmt?.reserves ?? 0;

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);
  const [starterSlots, setStarterSlots] = useState<Slot[]>([]);
  const [reserveSlots, setReserveSlots] = useState<Slot[]>([]);
  const [touched, setTouched] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialTeam?.name ?? "");
    setSymbol(initialTeam?.symbol ?? null);
    const starterMembers = (initialTeam?.members ?? []).filter((m) => !m.isReserve);
    const reserveMembers = (initialTeam?.members ?? []).filter((m) => m.isReserve);
    setStarterSlots(
      Array.from({ length: starters }, (_, i) => {
        const m = starterMembers[i];
        return m
          ? { name: m.playerName, accountId: m.accountId, winrate: m.winrate, battles: m.battles, avgDamage: m.avgDamage }
          : { ...EMPTY };
      })
    );
    setReserveSlots(
      Array.from({ length: reserves }, (_, i) => {
        const m = reserveMembers[i];
        return m
          ? { name: m.playerName, accountId: m.accountId, winrate: m.winrate, battles: m.battles, avgDamage: m.avgDamage }
          : { ...EMPTY };
      })
    );
    setTouched(false);
  }, [isOpen, initialTeam, starters, reserves]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  const slotFilled = (s: Slot) => (region ? s.accountId != null : s.name.trim().length > 0);
  const startersOk = useMemo(
    () => starterSlots.every((s) => (region ? s.accountId != null : s.name.trim().length > 0)),
    [starterSlots, region]
  );
  const nameOk = name.trim().length > 0;
  const canSubmit = nameOk && startersOk && !busy;

  if (!isOpen || !mounted) return null;

  const setStarter = (i: number, s: Slot) =>
    setStarterSlots((prev) => prev.map((x, idx) => (idx === i ? s : x)));
  const setReserve = (i: number, s: Slot) =>
    setReserveSlots((prev) => prev.map((x, idx) => (idx === i ? s : x)));

  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;
    const members: WbMemberInput[] = [];
    let slot = 0;
    for (const s of starterSlots) {
      members.push({
        slot: slot++,
        is_reserve: false,
        player_name: s.name.trim() || "Player",
        account_id: s.accountId,
        region: s.accountId != null ? region : null,
        winrate: s.winrate,
        battles: s.battles,
        avg_damage: s.avgDamage,
      });
    }
    for (const s of reserveSlots) {
      if (!slotFilled(s)) continue; // reserves optional
      members.push({
        slot: slot++,
        is_reserve: true,
        player_name: s.name.trim() || "Player",
        account_id: s.accountId,
        region: s.accountId != null ? region : null,
        winrate: s.winrate,
        battles: s.battles,
        avg_damage: s.avgDamage,
      });
    }
    onSubmit({ name: name.trim(), symbol, members });
  };

  const renderSlot = (
    s: Slot,
    set: (s: Slot) => void,
    label: string,
    required: boolean
  ) => (
    <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
      <div className="mb-1.5 text-xs font-bold text-zinc-300">
        {label} {required && <span className="text-red-300">*</span>}
      </div>
      {region ? (
        <BlitzValidator
          region={region}
          value={toValidated(s)}
          onChange={(p) => set(p ? fromValidated(p) : { ...EMPTY })}
        />
      ) : (
        <input
          value={s.name}
          onChange={(e) => set({ ...s, name: e.target.value })}
          placeholder="In-game name"
          className={inputClass}
        />
      )}
      {touched && required && !slotFilled(s) && (
        <p className="mt-1 text-xs font-semibold text-amber-200">Required.</p>
      )}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={initialTeam ? "Edit team" : "Register team"}
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div className="my-4 w-full max-w-md min-w-0 rounded-3xl bg-zinc-950/95 p-5 ring-1 ring-white/10 shadow-2xl sm:p-6">
          <h3 className="text-lg font-extrabold text-zinc-100">
            {initialTeam ? "Edit your team" : "Register your team"}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {fmt?.label ?? "Team"}
            {region ? ` · validate ${region.toUpperCase()} accounts` : " · no validation"}
          </p>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="block text-sm font-semibold text-zinc-300">Team name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Steel Hunters"
                maxLength={48}
                className={`${inputClass} mt-1.5`}
              />
              {touched && !nameOk && (
                <span className="mt-1 block text-xs font-semibold text-amber-200">Required.</span>
              )}
            </label>

            <SymbolPicker value={symbol} onChange={setSymbol} />

            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Starters</div>
              {starterSlots.map((s, i) =>
                <div key={`s${i}`}>{renderSlot(s, (v) => setStarter(i, v), `Player ${i + 1}`, true)}</div>
              )}
            </div>

            {reserves > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Reserves (optional)
                </div>
                {reserveSlots.map((s, i) =>
                  <div key={`r${i}`}>{renderSlot(s, (v) => setReserve(i, v), `Reserve ${i + 1}`, false)}</div>
                )}
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : initialTeam ? "Save team" : "Register team"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
