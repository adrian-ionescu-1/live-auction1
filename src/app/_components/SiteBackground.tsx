//
// Premium black + emerald arena backdrop.
// Layered so the page reads as deep black up close, but glows green with depth:
// a top emerald spotlight, a slow-drifting aurora, a fine emerald grid, a soft
// grain for texture, and a gentle vignette that frames without crushing to pure
// black. All decorative + non-interactive (pointer-events-none, aria-hidden).

export default function SiteBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05080a]"
    >
      {/* Deep emerald base wash — keeps the black but tints it premium green */}
      <div className="absolute inset-0 bg-[radial-gradient(125%_125%_at_50%_-10%,#0c1f1a_0%,#070b0d_45%,#05080a_100%)]" />

      {/* Top spotlight — the "arena lights" coming down from above */}
      <div className="absolute -top-48 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-emerald-500/14 blur-[120px] animate-glow-pulse" />

      {/* Slow-drifting aurora ribbons (emerald → teal) for living depth */}
      <div className="absolute left-1/2 top-24 h-[560px] w-[1000px] -translate-x-1/2 rounded-[50%] bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(16,185,129,0.12)_90deg,rgba(20,184,166,0.10)_200deg,transparent_320deg)] blur-3xl animate-aurora" />
      <div className="absolute -bottom-56 left-1/2 h-[560px] w-[1100px] -translate-x-1/2 rounded-full bg-emerald-600/8 blur-3xl animate-float-slow" />

      {/* Subtle palette accents — keep the cyan/fuchsia identity, very low key */}
      <div className="absolute top-1/3 -left-24 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.06] blur-3xl animate-float" />
      <div className="absolute bottom-10 -right-24 h-[440px] w-[440px] rounded-full bg-fuchsia-500/[0.045] blur-3xl animate-float-slow" />

      {/* Fine emerald-tinted tech grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,#000_25%,transparent_78%)]" />

      {/* Subtle grain for a premium, non-flat surface */}
      <div className="absolute inset-0 opacity-[0.035] mix-blend-soft-light bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />

      {/* Gentle vignette — frames the edges without crushing to pure black */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,4,5,0.55)_100%)]" />
    </div>
  );
}
