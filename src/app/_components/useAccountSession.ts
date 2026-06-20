//
// Single source of truth for "who is signed in" across the whole app, for BOTH
// login methods:
//   * key login    -> read from sessionStorage (set by the auction store).
//   * Discord login -> read from the Supabase Auth session via AccountService.
// Used by AccountMenu (the reusable account card) and SiteHeader.

"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountService } from "@/services/accountService";

const ROLE_LABEL: Record<string, string> = {
  USER: "Participant",
  ADMIN: "Admin",
  SPECTATOR: "Spectator",
};

// sessionStorage keys caching the Discord identity so the card shows instantly
// when navigating between pages (then revalidated against Supabase).
const ACCOUNT_CACHE = {
  id: "account_id",
  role: "account_role",
  name: "account_name",
  avatar: "account_avatar",
} as const;

export type AccountSession = {
  kind: "key" | "discord";
  id: string;
  role: string;
  name: string | null;
  avatarUrl: string | null;
};

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function initialsFrom(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function useAccountSession() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<AccountSession | null>(null);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    const readKey = (): AccountSession | null => {
      const id = sessionStorage.getItem("auction_user_id");
      const role = sessionStorage.getItem("auction_user_role");
      const name = sessionStorage.getItem("auction_user_name");
      return id && role ? { kind: "key", id, role, name, avatarUrl: null } : null;
    };

    const readDiscordCache = (): AccountSession | null => {
      const id = sessionStorage.getItem(ACCOUNT_CACHE.id);
      const role = sessionStorage.getItem(ACCOUNT_CACHE.role);
      const name = sessionStorage.getItem(ACCOUNT_CACHE.name);
      const avatarUrl = sessionStorage.getItem(ACCOUNT_CACHE.avatar);
      return id && role ? { kind: "discord", id, role, name, avatarUrl } : null;
    };

    try {
      // A real Discord account is the identity; the auction key session
      // (auction_user_*) is just a transient sub-activity a Discord bidder picks
      // up when they enter the room, so it must NOT shadow the Discord account.
      // Only the access-key admin has a key session and no Discord profile.
      const discordCache = readDiscordCache();
      if (discordCache) {
        setSession(discordCache);
      } else {
        setSession(readKey());
      }

      // Revalidate against Supabase. A Discord profile is authoritative; if there
      // is none, fall back to the key session (e.g. the access-key admin).
      AccountService.getMyProfile().then((profile) => {
        if (cancelled) return;

        if (profile) {
          sessionStorage.setItem(ACCOUNT_CACHE.id, profile.id);
          sessionStorage.setItem(ACCOUNT_CACHE.role, profile.role);
          sessionStorage.setItem(ACCOUNT_CACHE.name, profile.username);
          if (profile.avatarUrl) {
            sessionStorage.setItem(ACCOUNT_CACHE.avatar, profile.avatarUrl);
          } else {
            sessionStorage.removeItem(ACCOUNT_CACHE.avatar);
          }
          setSession({
            kind: "discord",
            id: profile.id,
            role: profile.role,
            name: profile.username,
            avatarUrl: profile.avatarUrl,
          });
        } else {
          Object.values(ACCOUNT_CACHE).forEach((k) =>
            sessionStorage.removeItem(k),
          );
          setSession(readKey());
        }
      });
    } catch {
      setSession(null);
    }

    // Re-read when the session changes:
    //  * "storage"          -> another tab logged in/out.
    //  * "account-session"  -> same tab updated it (e.g. the auction page sets
    //    the key username slightly after login). Same-tab writes don't fire the
    //    native "storage" event, so we dispatch this one manually.
    const sync = () => {
      // Same priority as initial load: Discord identity over the auction key.
      const cached = readDiscordCache();
      if (cached) {
        setSession(cached);
        return;
      }
      setSession(readKey());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("account-session", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
      window.removeEventListener("account-session", sync);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear BOTH sessions: a Discord bidder may also hold a transient auction
      // key session, and leaving it behind would make them look signed in again.
      sessionStorage.removeItem("auction_user_id");
      sessionStorage.removeItem("auction_user_role");
      sessionStorage.removeItem("auction_user_name");
      Object.values(ACCOUNT_CACHE).forEach((k) => sessionStorage.removeItem(k));
      if (session?.kind === "discord") {
        await AccountService.signOut();
      }
    } catch {
      /* ignore */
    }
    // Full reload clears any in-memory auction store/realtime from this tab.
    window.location.reload();
  }, [session]);

  const roleLabel = session
    ? session.kind === "discord"
      ? capitalize(session.role)
      : ROLE_LABEL[session.role] ?? session.role
    : "";
  const displayName = session?.name?.trim() || roleLabel || "Account";
  const initials = initialsFrom(session?.name?.trim() || roleLabel || "U");

  // Discord accounts get their dashboard; the key admin gets the admin control
  // center; other key participants get the auction room.
  const primaryAction =
    session?.kind === "discord"
      ? { href: "/dashboard", label: "Dashboard" }
      : session?.role === "ADMIN"
        ? { href: "/admin", label: "Admin dashboard" }
        : { href: "/login", label: "Go to the auction" };

  return {
    mounted,
    session,
    roleLabel,
    displayName,
    initials,
    primaryAction,
    logout,
  };
}
