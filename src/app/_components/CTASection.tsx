//
// The bottom call-to-action block that repeated (near-identically) at the
// end of every static page.

import { GlowLink, PrimaryLink } from "./ui";

export type CTALink = { href: string; label: string; glow?: string };

export default function CTASection({
  title,
  subtitle,
  links = [],
  primaryHref = "/login",
  primaryLabel = "Enter Auction",
  gradient = "from-emerald-500/12 via-cyan-500/10 to-fuchsia-500/10",
}: {
  title: string;
  subtitle: string;
  links?: CTALink[];
  primaryHref?: string;
  primaryLabel?: string;
  gradient?: string;
}) {
  return (
    <div
      className={`rounded-3xl bg-gradient-to-r ${gradient} ring-1 ring-white/10 p-7 sm:p-10`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-extrabold sm:text-2xl">{title}</div>
          <div className="mt-2 text-sm text-zinc-300">{subtitle}</div>

          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {links.map((l) => (
                <GlowLink key={l.href + l.label} href={l.href} glow={l.glow}>
                  {l.label} <span aria-hidden>→</span>
                </GlowLink>
              ))}
            </div>
          )}
        </div>

        <PrimaryLink href={primaryHref} size="lg">
          {primaryLabel}
        </PrimaryLink>
      </div>
    </div>
  );
}
