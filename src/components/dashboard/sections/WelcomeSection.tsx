// The Welcome section: the home of the dashboard for a guest, and the secondary
// "home" once they pick a game. Holds the WoT Blitz consent card (action or
// informational), demo cards for future games/events, and the account / explore
// / coming-soon cards. Mobile-first.

"use client";

import Link from "next/link";
import { Profile } from "@/types/account.types";
import { roleMeta } from "@/components/admin/roleMeta";
import { GradientCard } from "@/app/_components/ui";
import WotBlitzConsentCard from "@/components/dashboard/WotBlitzConsentCard";

// A muted placeholder for a future game / event type (demo only).
function FutureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/10">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400 ring-1 ring-white/10">
        Coming soon
      </span>
      <h3 className="mt-3 text-lg font-extrabold text-zinc-300">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{desc}</p>
      <span className="mt-4 inline-flex w-fit items-center rounded-xl bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-500 ring-1 ring-white/10">
        Not available yet
      </span>
    </div>
  );
}

export default function WelcomeSection({
  profile,
  memberSince,
  onConsented,
}: {
  profile: Profile;
  memberSince: string;
  onConsented: () => void;
}) {
  const consented = profile.wotblitzConsentedAt !== null || profile.roles.includes("wotblitz");

  return (
    <div className="space-y-6">
      {/* WoT Blitz onboarding (action when new, informational once joined). */}
      <WotBlitzConsentCard consented={consented} onConsented={onConsented} />

      {/* Demo: future games / event types. */}
      <div>
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-zinc-300">
          More on the way
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FutureCard
            title="World of Tanks (PC)"
            desc="A dedicated hub for WoT PC events and tournaments, with account linking like Blitz."
          />
          <FutureCard
            title="More games & events"
            desc="Other titles and community events will land here — each with its own profile and sign-up."
          />
        </div>
      </div>

      {/* Account / Explore / Coming soon. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <GradientCard className="p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Account</div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-400">Username</dt>
              <dd className="truncate font-semibold text-zinc-100">{profile.username}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-400">Role</dt>
              <dd className="font-semibold text-zinc-100">{roleMeta(profile.role).label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-400">Signed in via</dt>
              <dd className="font-semibold text-zinc-100">Discord</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-400">Member since</dt>
              <dd className="font-semibold text-zinc-100">{memberSince}</dd>
            </div>
          </dl>
        </GradientCard>

        <GradientCard className="p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Explore</div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link
              href="/tournaments"
              className="rounded-xl bg-white/5 px-3 py-2.5 font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Tournaments
            </Link>
            <Link
              href="/streamers"
              className="rounded-xl bg-white/5 px-3 py-2.5 font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Become a streamer
            </Link>
            <Link
              href="/rules"
              className="rounded-xl bg-white/5 px-3 py-2.5 font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Rules
            </Link>
          </div>
        </GradientCard>

        <GradientCard className="p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Coming soon</div>
          <p className="mt-4 text-sm text-zinc-400">
            Member features are on the way — personal stats, saved squads and tournament entries
            will appear here as we roll them out.
          </p>
          <span className="mt-4 inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400 ring-1 ring-white/10">
            In development
          </span>
        </GradientCard>
      </div>
    </div>
  );
}
