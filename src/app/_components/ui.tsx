//
// Shared presentational primitives used across the marketing/static pages.
// Keeping them in one place removes the heavy duplication that previously
// lived in every page.tsx (Badge / GlowLink / card / CTA button).

import Link from "next/link";

/** Small pill label, e.g. "ESPORTS EDITION". */
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 text-zinc-200">
      {children}
    </span>
  );
}

/** Ghost-style link button with a soft glow on hover. */
export function GlowLink({
  href,
  children,
  glow = "shadow-[0_0_50px_rgba(34,211,238,0.12)]",
  prefetch,
}: {
  href: string;
  children: React.ReactNode;
  glow?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="group relative inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      <span
        className={`pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100 ${glow}`}
      />
      <span className="relative">{children}</span>
    </Link>
  );
}

/** Primary emerald call-to-action link (login / enter auction). */
export function PrimaryLink({
  href,
  children,
  size = "md",
  glow = "shadow-[0_0_60px_rgba(16,185,129,0.18)]",
}: {
  href: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  glow?: string;
}) {
  const pad =
    size === "lg"
      ? "rounded-2xl px-7 py-3"
      : size === "md"
      ? "rounded-2xl px-6 py-3"
      : "rounded-xl px-4 py-2";

  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center justify-center text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/25 bg-emerald-500/15 transition hover:bg-emerald-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${pad}`}
    >
      <span
        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 ${glow}`}
      />
      <span className="relative">{children}</span>
    </Link>
  );
}

/** Title + description card with an optional glow accent on hover. */
export function InfoCard({
  title,
  desc,
  glow,
}: {
  title: string;
  desc: string;
  glow?: string;
}) {
  return (
    <div className="group relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 transition hover:bg-white/10">
      {glow && (
        <span
          className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition group-hover:opacity-100 ${glow}`}
        />
      )}
      <div className="relative">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-3 text-sm text-zinc-400">{desc}</div>
      </div>
    </div>
  );
}

/** Thin gradient divider. */
export function Divider({
  className = "",
  via = "via-emerald-400/30",
}: {
  className?: string;
  via?: string;
}) {
  return (
    <div
      className={`h-px w-full bg-gradient-to-r from-transparent ${via} to-transparent ${className}`}
    />
  );
}
