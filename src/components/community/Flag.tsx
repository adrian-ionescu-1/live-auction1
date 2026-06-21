// Renders a country flag as a coloured Twemoji image, so it looks the same on
// every OS (Windows has no flag-emoji font and would otherwise show two letters).
// Returns nothing when there's no valid code, so callers can drop it in freely.

"use client";

import { flagImageUrl } from "@/lib/flags";

export default function Flag({
  code,
  className = "h-4 w-auto",
}: {
  code: string | null | undefined;
  /** Size/shape via Tailwind (height-based; width stays auto). */
  className?: string;
}) {
  const url = flagImageUrl(code);
  if (!url) return null;
  return (
    // Plain <img>: a tiny external SVG that doesn't benefit from next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden
      loading="lazy"
      className={`inline-block rounded-[3px] ${className}`}
    />
  );
}
