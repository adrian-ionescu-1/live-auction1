// The WoT Blitz member's Profile section: their linked in-game account (rendered
// like a personal game profile), a "switch account" guard, the events they've
// registered for, and any unread auction/event notifications. Mobile-first.

"use client";

import { useState } from "react";
import { Profile } from "@/types/account.types";
import { CommunityEvent } from "@/types/community-event.types";
import { registrationState } from "@/components/admin/communityEventMeta";
import { CommunityEventsService } from "@/services/communityEventsService";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ConsentConfirmDialog from "@/components/dashboard/ConsentConfirmDialog";
import BlitzAccountLinker from "@/components/dashboard/BlitzAccountLinker";
import BlitzStatsCards from "@/components/dashboard/BlitzStatsCards";

export interface DashboardNotice {
  id: string;
  kind: "auction" | "event";
  title: string;
  detail: string;
}

function NoticeCard({ notices }: { notices: DashboardNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="rounded-3xl bg-red-500/10 p-5 ring-1 ring-red-400/25">
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-red-400/70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-red-100">
          New for you
        </h3>
      </div>
      <ul className="mt-3 space-y-2">
        {notices.map((n) => (
          <li
            key={n.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/10"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-100">{n.title}</p>
              <p className="truncate text-xs text-zinc-400">{n.detail}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                n.kind === "auction"
                  ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
                  : "bg-amber-500/15 text-amber-200 ring-amber-400/25"
              }`}
            >
              {n.kind}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RegistrationsCard({
  events,
  onWithdraw,
}: {
  events: CommunityEvent[];
  onWithdraw: (event: CommunityEvent) => void;
}) {
  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">My registrations</div>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          You haven&apos;t registered for any events yet. They&apos;ll show up here once you do.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {events.map((ev) => {
            const state = registrationState(ev.registrationOpensAt, ev.registrationClosesAt);
            const badge =
              state === "open"
                ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
                : state === "before"
                  ? "bg-amber-500/15 text-amber-200 ring-amber-400/25"
                  : "bg-white/10 text-zinc-300 ring-white/15";
            const label =
              state === "open" ? "Open" : state === "before" ? "Upcoming" : "Closed";
            return (
              <li
                key={ev.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/10"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
                  {ev.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badge}`}
                >
                  {label}
                </span>
                {state === "open" && (
                  <button
                    type="button"
                    onClick={() => onWithdraw(ev)}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/15"
                  >
                    Withdraw
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ProfileSection({
  profile,
  registrations,
  notices,
  onRefresh,
}: {
  profile: Profile;
  registrations: CommunityEvent[];
  notices: DashboardNotice[];
  onRefresh: () => void;
}) {
  const [relinking, setRelinking] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [withdrawing, setWithdrawing] = useState<CommunityEvent | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const link = profile.blitz;

  const handleWithdraw = async () => {
    if (!withdrawing) return;
    setWithdrawBusy(true);
    setWithdrawError(null);
    const res = await CommunityEventsService.withdraw(withdrawing.id);
    setWithdrawBusy(false);
    if (res.success) {
      setWithdrawing(null);
      onRefresh();
    } else {
      setWithdrawError(res.error ?? "Could not withdraw. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <NoticeCard notices={notices} />

      {link && !relinking ? (
        <BlitzStatsCards link={link} onChange={() => setConfirmSwitch(true)} />
      ) : (
        <BlitzAccountLinker
          onLinked={() => {
            setRelinking(false);
            onRefresh();
          }}
          onCancel={link ? () => setRelinking(false) : undefined}
        />
      )}

      <RegistrationsCard events={registrations} onWithdraw={setWithdrawing} />

      {/* Switch-account guard: make sure it's really their own account. */}
      <ConfirmDialog
        isOpen={confirmSwitch}
        title="Switch to a different account?"
        message="You'll re-link your WoT Blitz account. Make sure it's your own personal in-game account so the stats shown are correct."
        tone="primary"
        confirmLabel="Yes, switch account"
        onConfirm={() => {
          setConfirmSwitch(false);
          setRelinking(true);
        }}
        onCancel={() => setConfirmSwitch(false)}
      />

      {/* Withdraw guard: the member must consciously own the decision. */}
      <ConsentConfirmDialog
        isOpen={withdrawing !== null}
        title="Withdraw from this event?"
        message={
          <>
            You&apos;ll be removed from{" "}
            <span className="font-semibold text-zinc-200">{withdrawing?.title}</span>. You can
            register again while registration is still open, but your current entry will be gone.
          </>
        }
        checkboxLabel="I understand and want to withdraw my registration."
        confirmLabel="Withdraw"
        tone="danger"
        busy={withdrawBusy}
        error={withdrawError}
        onConfirm={handleWithdraw}
        onCancel={() => {
          setWithdrawing(null);
          setWithdrawError(null);
        }}
      />
    </div>
  );
}
