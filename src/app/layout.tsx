// src/app/layout.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteBackground from "./_components/SiteBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Auction App • WoT Blitz Tournament Draft",
  description:
    "Esports tournament auction draft for WoT Blitz. Real-time bidding, fair-play rules, and spectator mode.",
};

function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-zinc-500 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span>© {new Date().getFullYear()} Auction App • Tournament Draft</span>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
              <Link href="/" className="hover:text-zinc-300 transition">
                Home
              </Link>
              <span className="text-zinc-700">•</span>
              <Link href="/tournaments" className="hover:text-zinc-300 transition">
                Tournaments
              </Link>
              <span className="text-zinc-700">•</span>
              <Link href="/rules" className="hover:text-zinc-300 transition">
                Rules
              </Link>
              <span className="text-zinc-700">•</span>
              <Link href="/faq" className="hover:text-zinc-300 transition">
                FAQ
              </Link>
            </div>
          </div>

          <span className="text-zinc-400">
            Built by <span className="text-zinc-300 font-medium">Adrian</span> — Full-Stack Developer •
            Discord: <span className="text-emerald-300 font-medium">_the_adrian_</span>
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
      <body className={`${inter.className} bg-zinc-950 text-zinc-100`}>
        <SiteBackground />

        {/* Wrapper global ca să ai min height + footer jos */}
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
