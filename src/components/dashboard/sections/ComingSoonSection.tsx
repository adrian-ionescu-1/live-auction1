// A premium placeholder for sections that are planned but not built yet
// (Events & Tournaments, Contact / Support). Mobile-first.

"use client";

export default function ComingSoonSection({
  icon,
  title,
  description,
  bullets,
}: {
  icon: string;
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 ring-1 ring-white/10 sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-lg text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-3xl ring-1 ring-white/10">
          {icon}
        </span>
        <span className="mt-5 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/25">
          Coming soon
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-100">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>

        {bullets && bullets.length > 0 && (
          <ul className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-2 text-left sm:grid-cols-2">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2 text-sm text-zinc-300 ring-1 ring-white/10"
              >
                <span aria-hidden className="text-emerald-300">
                  ◆
                </span>
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
