import type { Metadata } from "next";
import SiteHeader from "../_components/SiteHeader";
import { Badge } from "../_components/ui";
import VisitorContactForm from "@/components/contact/VisitorContactForm";
import DiscordCard from "@/components/contact/DiscordCard";

export const metadata: Metadata = {
  title: "Contact • Auction App",
  description:
    "Get in touch about hosting a WoT Blitz event, tournaments, auctions or anything else — by email or Discord.",
};

export default function ContactPage() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader subtitle="Contact" />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="inline-flex animate-fade-up flex-wrap items-center gap-2">
            <Badge>Get in touch</Badge>
            <Badge>WoT Blitz</Badge>
          </div>
          <h1 className="animate-fade-up text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl [animation-delay:60ms]">
            Contact &amp;{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
              collaborations
            </span>
          </h1>
          <p className="max-w-xl animate-fade-up text-zinc-300 [animation-delay:120ms]">
            Want to host a WoT Blitz event, run a tournament or an auction draft, or just have a
            question? Send a message below or reach me on Discord.
          </p>
        </div>

        <div className="mt-8 grid animate-fade-up gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start [animation-delay:160ms]">
          <VisitorContactForm />

          <div className="flex flex-col gap-6">
            <DiscordCard />
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">What I can help with</div>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {[
                  "Hosting a WoT Blitz event for your community",
                  "Running tournaments (groups + brackets)",
                  "Auction-draft events with live bidding",
                  "Anything else — just ask",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-emerald-300">◆</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
