// src/app/_components/SiteBackground.tsx

export default function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* Tech grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#00000000_0%,#000000aa_60%,#000000ee_100%)]" />

      {/* Arena glows */}
      <div className="absolute -top-44 left-1/2 h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-3xl animate-pulse" />
      <div className="absolute top-32 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-48 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-fuchsia-500/6 blur-3xl" />
    </div>
  );
}
