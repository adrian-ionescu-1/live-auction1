import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteBackground from "./_components/SiteBackground";
import Logo from "./_components/Logo";
import AccountPresence from "./_components/AccountPresence";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Auction App • WoT Blitz Tournament Draft",
  description:
    "Esports tournament auction draft for WoT Blitz. Real-time bidding, fair-play rules, and spectator mode.",
};

function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-zinc-950/50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <Logo className="h-10 w-10" />
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-wide text-zinc-100">
                  Auction App
                </div>
                <div className="text-xs text-zinc-400">WoT Blitz Tournament Draft</div>
              </div>
            </Link>

            <p className="mt-4 max-w-xs text-sm text-zinc-400">
              An arena-style auction draft for WoT Blitz tournaments — live bidding,
              fair-play rules and real-time squad building.
            </p>
          </div>

          {/* Explore */}
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">Explore</div>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { href: "/", label: "Home" },
                { href: "/tournaments", label: "Tournaments" },
                { href: "/rules", label: "Rules" },
                { href: "/faq", label: "FAQ" },
                { href: "/spectator", label: "Spectator" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-zinc-400 transition hover:text-zinc-100"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Get started
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/login" className="text-zinc-400 transition hover:text-zinc-100">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/spectator" className="text-zinc-400 transition hover:text-zinc-100">
                  Watch as spectator
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Auction App • Tournament Draft</span>

          <span className="text-zinc-400">
            Built by{" "}
            <span className="font-medium text-emerald-300">The Adrian One</span>{" "}
            — Full-Stack Developer
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#05080a] text-zinc-100`}>
        <SiteBackground />

        {/* Global wrapper for min height + footer at the bottom */}
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
        <AccountPresence />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
