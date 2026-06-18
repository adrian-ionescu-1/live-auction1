import type { Metadata } from "next";
import SiteHeader from "./_components/SiteHeader";
import { GlowLink, PrimaryLink } from "./_components/ui";

export const metadata: Metadata = {
  title: "Page not found • Auction App",
  description: "The page you are looking for doesn’t exist or has moved.",
};

export default function NotFound() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader subtitle="Page not found" />

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10">
          <span className="font-semibold text-emerald-300">404</span>
          <span className="text-zinc-400">•</span>
          <span className="text-zinc-300">Off the draft board</span>
        </div>

        <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          This page isn’t in the lineup
        </h1>
        <p className="mt-4 max-w-md text-zinc-300">
          The page you’re looking for doesn’t exist or may have moved. Head back
          home or jump straight into the draft.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <PrimaryLink href="/" size="md">
            Back to home
          </PrimaryLink>
          <div className="flex flex-wrap justify-center gap-3">
            <GlowLink href="/tournaments" glow="shadow-[0_0_50px_rgba(34,211,238,0.12)]">
              Tournaments <span aria-hidden>→</span>
            </GlowLink>
            <GlowLink href="/rules" glow="shadow-[0_0_50px_rgba(16,185,129,0.12)]">
              Rules <span aria-hidden>→</span>
            </GlowLink>
            <GlowLink href="/faq" glow="shadow-[0_0_50px_rgba(255,255,255,0.08)]">
              FAQ <span aria-hidden>→</span>
            </GlowLink>
          </div>
        </div>
      </section>
    </main>
  );
}
