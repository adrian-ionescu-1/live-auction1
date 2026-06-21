// Warns the admin before they leave a half-filled create form. Nothing is saved
// until they submit, so leaving means starting over. Covers:
//   * in-app navigation (clicking a link/menu item) -> a custom 2-button dialog.
//   * tab close / refresh / hard navigation         -> the browser's native prompt.
// Render it with `when={dirty}` and it does the rest. The confirm button leaves
// (and discards); "Cancel" keeps them on the page.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function UnsavedChangesGuard({
  when,
  title = "Leave without saving?",
  message = "You've started filling this in, but nothing is saved yet. If you leave now, everything resets and you'll have to start over from scratch.",
}: {
  when: boolean;
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Tab close / refresh / cross-document navigation: the native prompt is the
  // only thing browsers allow here (no custom buttons possible).
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  // In-app navigation: intercept link clicks while the form is dirty and ask
  // first. Capture phase so we beat Next.js's own click handling.
  useEffect(() => {
    if (!when) return;
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const here = window.location.pathname + window.location.search;
      if (url.pathname + url.search === here) return;
      e.preventDefault();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [when]);

  const leave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  }, [pendingHref, router]);

  return (
    <ConfirmDialog
      isOpen={pendingHref !== null}
      title={title}
      message={message}
      tone="danger"
      confirmLabel="Leave & discard"
      onConfirm={leave}
      onCancel={() => setPendingHref(null)}
    />
  );
}
