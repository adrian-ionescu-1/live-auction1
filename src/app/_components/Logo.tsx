//
// Brand logo: the logo image inside a rounded card with a soft blurred glow
// around its edges and the pulsing green status dot. Reused by the navbar,
// footer, login and dashboard so the logo stays consistent everywhere.
// Server-safe (no hooks) — works in both server and client components.

import Image from "next/image";
import logo from "@/app/logo-page.jpg";

export default function Logo({
  className = "h-10 w-10",
  dot = true,
  priority = false,
}: {
  /** Tailwind size classes for the card (e.g. "h-9 w-9 sm:h-10 sm:w-10"). */
  className?: string;
  /** Show the glowing status dot. */
  dot?: boolean;
  /** Eager-load above-the-fold (navbar / login). */
  priority?: boolean;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Blurred glow around the card edges */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/45 via-cyan-400/30 to-emerald-400/45 blur-md"
      />

      {/* Logo card */}
      <span className="relative block h-full w-full overflow-hidden rounded-2xl ring-1 ring-white/15">
        <Image
          src={logo}
          alt="Auction App"
          fill
          sizes="64px"
          className="object-cover"
          priority={priority}
        />
      </span>

      {/* Glowing status dot — small and bright light-green so it pops */}
      {dot && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300 ring-1 ring-emerald-100/70 shadow-[0_0_9px_rgba(110,231,183,1)] animate-glow-pulse"
        />
      )}
    </div>
  );
}
