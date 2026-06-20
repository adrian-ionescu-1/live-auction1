// Admin section shell: a single client-side role gate + the shared nav for
// every /admin page. Consistent with the rest of the app, the gate is
// client-side (the auction itself stays server-authoritative). Only the
// access-key ADMIN may view these pages.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = sessionStorage.getItem("auction_user_role");
    if (role !== "ADMIN") {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) return null;

  return (
    <div className="relative min-h-screen">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
