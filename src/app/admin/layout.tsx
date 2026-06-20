// Admin section shell: a single client-side role gate + the shared nav for
// every /admin page. Consistent with the rest of the app, the gate is
// client-side (the auction itself stays server-authoritative).
//
// Two kinds of account may view these pages:
//   1. The access-key ADMIN (their session role is set at key login).
//   2. A Discord account an admin has promoted to the 'admin' role — this is
//      how admin rights are handed to a normal signed-in member.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import { AccountService } from "@/services/accountService";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const check = async () => {
      // 1. Access-key admin: their role is stored synchronously at key login.
      if (sessionStorage.getItem("auction_user_role") === "ADMIN") {
        if (!cancelled) setAllowed(true);
        return;
      }
      // 2. Discord account promoted to the 'admin' role. Read the live profile
      //    (not the cached account chip) so someone whose admin role was just
      //    revoked can't keep access from a stale cache.
      const profile = await AccountService.getMyProfile();
      if (cancelled) return;
      if (profile && profile.role.toLowerCase() === "admin") {
        setAllowed(true);
      } else {
        router.replace("/login");
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!allowed) return null;

  return (
    <div className="relative min-h-screen">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
