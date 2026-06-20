'use client';

import { useEffect, useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import { AuctionEngine } from '@/services/auctionEngine';
import { User } from '@/types/auction.types';
import TargetProgress from './TargetProgress';
import { TARGET_PLAYERS, calcReserve } from '@/config/auctionRules';

// Admin controls on a participant: set their budget + ban / unban. Reads stay
// live via the store's realtime users channel, so we just fire the RPCs.
function AdminParticipantActions({ user }: { user: User }) {
  const [budget, setBudget] = useState(String(user.balance ?? 0));
  const [busy, setBusy] = useState(false);

  // Keep the input in sync if the balance changes elsewhere (e.g. a settle).
  useEffect(() => {
    setBudget(String(user.balance ?? 0));
  }, [user.balance]);

  const saveBudget = async () => {
    const value = Math.max(0, Math.round(Number(budget) || 0));
    setBusy(true);
    await AuctionEngine.setParticipantBalance(user.id, value);
    setBusy(false);
  };

  const toggleBan = async () => {
    setBusy(true);
    await AuctionEngine.setParticipantBanned(user.id, !user.banned);
    setBusy(false);
  };

  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            $
          </span>
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={busy}
            aria-label={`Budget for ${user.username}`}
            className="w-full rounded-xl bg-black/30 py-2 pl-6 pr-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={saveBudget}
          disabled={busy}
          className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-60"
        >
          Set budget
        </button>
      </div>
      <button
        type="button"
        onClick={toggleBan}
        disabled={busy}
        className={`w-full rounded-xl px-3 py-2 text-xs font-bold ring-1 transition disabled:opacity-60 ${
          user.banned
            ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25 hover:bg-emerald-500/25'
            : 'bg-red-500/15 text-red-200 ring-red-400/25 hover:bg-red-500/25'
        }`}
      >
        {user.banned ? 'Unban — allow bidding' : 'Ban — block bidding'}
      </button>
    </div>
  );
}

export default function AdminUserCards() {
  const { currentUserRole, users, onlineUserIds } = useAuctionStore();

  if (currentUserRole !== 'ADMIN') {
    return null;
  }

  const online = new Set(onlineUserIds);

  // Show every participant. They stay on the board for the whole auction (they
  // don't drop off when they disconnect); the list resets with the auction.
  const participants = users.filter((u) => u.role === 'USER');

  const onlineCount = participants.filter((u) => online.has(u.id)).length;
  const bannedCount = participants.filter((u) => u.banned).length;

  return (
    <div className="w-full rounded-3xl bg-white/5 ring-1 ring-white/10 p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-100">
          User Squad Overview
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {onlineCount} online
          </span>
          {bannedCount > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-200 ring-1 ring-red-400/25">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {bannedCount} banned
            </span>
          )}
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-8 text-center">
          <p className="text-sm font-semibold text-zinc-300">No participants yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Bidders who enter the auction appear here. Set their budget and ban /
            unban them from each card.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {participants.map((user, idx) => {
            const wonPlayers = user.wonPlayers || [];
            const wonCount = wonPlayers.length;

            const totalSpent = wonPlayers.reduce((sum, p) => sum + (p?.amount || 0), 0);

            const remainingSlots = Math.max(0, TARGET_PLAYERS - wonCount);
            const reserved = calcReserve(remainingSlots);
            const balance = user.balance || 0;
            const spendable = Math.max(0, balance - reserved);

            const completed = wonCount >= TARGET_PLAYERS;
            const isOnline = online.has(user.id);

            return (
              <div
                key={user.id}
                style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                className={`animate-fade-up rounded-2xl p-4 transition ring-1 hover:-translate-y-0.5 ${
                  user.banned
                    ? 'bg-red-500/5 ring-red-400/25'
                    : completed
                      ? 'bg-emerald-500/5 ring-emerald-400/25'
                      : 'bg-black/25 ring-white/10 hover:ring-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-white/10 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        title={isOnline ? 'Online' : 'Offline'}
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isOnline
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                            : 'bg-zinc-500'
                        }`}
                      />
                      <h4 className="text-lg font-bold text-zinc-100 truncate">
                        {user.username}
                      </h4>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {user.banned && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-200 ring-1 ring-red-400/25">
                          Banned
                        </span>
                      )}
                      {completed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25">
                          Target completed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-400">Balance</p>
                    <p className="text-lg font-extrabold text-emerald-200">
                      ${balance.toLocaleString()}
                    </p>

                    <div className="mt-1 text-xs text-zinc-400 space-y-0.5">
                      <div>
                        Reserved:{' '}
                        <span className="font-semibold text-zinc-200">
                          ${reserved.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        Spendable:{' '}
                        <span className="font-semibold text-zinc-200">
                          ${spendable.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target progress */}
                <TargetProgress wonCount={wonCount} />

                {/* Players won list */}
                <div className="mt-3">
                  <p className="text-sm font-semibold text-zinc-300 mb-2">
                    Players Won ({wonPlayers.length})
                  </p>

                  {wonPlayers.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {wonPlayers.map((playerWon, index) => (
                        <div
                          key={`${playerWon?.playerId || index}-${index}`}
                          className="rounded-xl p-2 text-sm bg-white/5 ring-1 ring-white/10"
                        >
                          <p className="font-semibold text-zinc-100">
                            {playerWon?.playerName || 'Unknown Player'}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Bought for:{' '}
                            <span className="font-bold text-emerald-200">
                              ${(playerWon?.amount || 0).toLocaleString()}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">No players yet</p>
                  )}
                </div>

                {/* Total spent */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-zinc-400">Total Spent</p>
                    <p className="text-lg font-extrabold text-red-200">
                      ${totalSpent.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Admin: budget + ban */}
                <AdminParticipantActions user={user} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
