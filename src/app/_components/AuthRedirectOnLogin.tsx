//
// After a fresh Discord (OAuth) sign-in, send the member to their dashboard.
//
// Discord uses Supabase's implicit flow, so it returns to the site with the
// session token in the URL hash (#access_token=…). Supabase is configured with
// redirectTo "/dashboard", but if the project's "Redirect URLs" allowlist does
// not include that path, Supabase falls back to the Site URL (the public home),
// leaving the member on a page they could already see signed-out. This guard
// fixes that purely client-side: when it sees an OAuth callback in the URL, it
// routes the now-signed-in member to /dashboard itself.
//
// It only acts on the actual callback load (token present in the hash), so an
// already-signed-in member visiting the home page on purpose is never bounced.
// Mounted once globally in the root layout; renders nothing.

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthRedirectOnLogin() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // A genuine Discord callback carries the token in the hash. Capture this
    // synchronously on mount, before `detectSessionInUrl` clears it.
    const isOAuthCallback = window.location.hash.includes("access_token");
    if (!isOAuthCallback) return;

    // Already on an account area (correct redirect happened) — let that page's
    // own auth logic take over; nothing to do here.
    if (pathname === "/dashboard" || pathname.startsWith("/admin")) return;

    let cancelled = false;

    // getSession() resolves only after Supabase has parsed the hash, so a
    // returned session means the sign-in completed.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return null;
}
