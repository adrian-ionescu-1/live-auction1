// Matches: the post-auction tournament fixtures between the squads. Placeholder
// for now — the bracket / schedule / results land here in a future iteration.
// The admin layout provides the nav, role gate and page container.

export default function AdminMatchesPage() {
  return (
    <section className="animate-fade-up">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
        Matches
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Once an auction closes, the squads face off here. The fixtures and results
        will live on this page.
      </p>

      <div className="mt-6 rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
        <span className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-emerald-500/15 text-2xl ring-1 ring-emerald-400/25">
          ⚔️
        </span>
        <p className="mt-4 text-sm font-semibold text-zinc-200">Coming soon</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
          We&apos;ll build the matches schedule and bracket here next — pairing the
          teams drafted in the auction and tracking their results.
        </p>
        <span className="mt-4 inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400 ring-1 ring-white/10">
          In development
        </span>
      </div>
    </section>
  );
}
