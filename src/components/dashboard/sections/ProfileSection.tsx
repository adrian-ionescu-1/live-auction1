// The WoT Blitz member's Profile section: their linked in-game account (rendered
// like a personal game profile), a "switch account" guard, the events they've
// registered for, and any unread auction/event notifications. Mobile-first.

"use client";

import { useEffect, useState } from "react";
import { Profile } from "@/types/account.types";
import { CommunityEvent, MyRegistration } from "@/types/community-event.types";
import { registrationState } from "@/components/admin/communityEventMeta";
import { CommunityEventsService } from "@/services/communityEventsService";
import CardArt from "@/components/auction/cardDesigns";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ConsentConfirmDialog from "@/components/dashboard/ConsentConfirmDialog";
import BlitzAccountLinker from "@/components/dashboard/BlitzAccountLinker";
import BlitzStatsCards from "@/components/dashboard/BlitzStatsCards";
import MyTournamentTeamsCard from "@/components/tournaments/wb/MyTournamentTeamsCard";

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

// The member's personalized card for one registration (their chosen design,
// flag and validated stats — exactly what shows up in the auction).
function MyCard({ reg }: { reg: MyRegistration }) {
  const hasStats = reg.blitzStats !== null;
  return (
    <div className="mt-3 flex justify-center">
      <CardArt
        variant={reg.cardVariant}
        name={reg.playerName || reg.displayName}
        flag={reg.flag}
        winrate={hasStats ? reg.blitzStats!.winrate : null}
        battles={hasStats ? reg.blitzStats!.battles : null}
        avgDamage={hasStats ? reg.blitzStats!.avgDamage : null}
        startingBid={null}
        hasStats={hasStats}
      />
    </div>
  );
}

function RegistrationsCard({
  events,
  myRegs,
  onWithdraw,
}: {
  events: CommunityEvent[];
  myRegs: Map<string, MyRegistration>;
  onWithdraw: (event: CommunityEvent) => void;
}) {
  // Personalized cards are collapsed by default so the list stays compact.
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">My registrations</div>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          You haven&apos;t registered for any events yet. They&apos;ll show up here once you do.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
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
            const reg = myRegs.get(ev.id);
            return (
              <li
                key={ev.id}
                className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
                    {ev.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badge}`}
                  >
                    {label}
                  </span>
                  {reg && (
                    <button
                      type="button"
                      onClick={() => setOpenCardId(openCardId === ev.id ? null : ev.id)}
                      aria-expanded={openCardId === ev.id}
                      className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                    >
                      {openCardId === ev.id ? "Hide card" : "View my card"}
                    </button>
                  )}
                  {state === "open" && (
                    <button
                      type="button"
                      onClick={() => onWithdraw(ev)}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/15"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
                {reg && openCardId === ev.id && <MyCard reg={reg} />}
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
  const [myRegs, setMyRegs] = useState<Map<string, MyRegistration>>(new Map());

  // The member's own registration details (card design, flag, validated stats),
  // so we can show their personalized card under each registered event. Reloads
  // whenever the registrations list changes (e.g. after a new sign-up).
  useEffect(() => {
    let active = true;
    CommunityEventsService.listMyRegistrations().then((rows) => {
      if (active) setMyRegs(new Map(rows.map((r) => [r.eventId, r])));
    });
    return () => {
      active = false;
    };
  }, [registrations]);

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

      <RegistrationsCard events={registrations} myRegs={myRegs} onWithdraw={setWithdrawing} />

      <MyTournamentTeamsCard profileId={profile.id} />

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
