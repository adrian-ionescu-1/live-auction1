// "We host it for you" promo band: pitches the hosting service and points to the
// contact page to negotiate a custom offer. Reused on the home and visitor pages
// so the call-to-action stays consistent. Mobile-first, premium glass styling.

import { PrimaryLink, GlowLink } from "./ui";
import { HOSTING_POINTS } from "../_data/home-content";

export default function HostBanner({
  title = "Need it hosted? We run it for you.",
  subtitle = "Events, tournaments or auction drafts for your community — we set it up, host it live and tailor the format. Tell us what you need and we'll put together a custom offer.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/12 via-cyan-500/10 to-fuchsia-500/12 p-6 ring-1 ring-white/10 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">
            Hosting &amp; custom offers
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-xl text-sm text-zinc-300">{subtitle}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PrimaryLink href="/contact" size="md" glow="shadow-[0_0_60px_rgba(16,185,129,0.2)]">
              Get a custom offer
            </PrimaryLink>
            <GlowLink href="/contact" glow="shadow-[0_0_50px_rgba(34,211,238,0.12)]">
              Let&apos;s talk <span aria-hidden>→</span>
            </GlowLink>
          </div>
        </div>

        <ul className="grid gap-2">
          {HOSTING_POINTS.map((p) => (
            <li
              key={p}
              className="flex items-start gap-2.5 rounded-2xl bg-black/25 px-3.5 py-2.5 text-sm text-zinc-200 ring-1 ring-white/10"
            >
              <span aria-hidden className="mt-0.5 text-emerald-300">
                ✓
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
