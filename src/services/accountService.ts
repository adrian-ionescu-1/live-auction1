import { supabase, SupabaseProfile } from "@/lib/supabase";
import { BlitzLink, Profile, DEFAULT_ACCOUNT_ROLE } from "@/types/account.types";
import { BlitzAccountDetails } from "@/types/blitz.types";
import { BlitzRegion } from "@/types/community-event.types";

// Rebuild a member's linked Blitz account from the stored profile columns.
function blitzLinkFromProfile(p: SupabaseProfile): BlitzLink | null {
  const region = p.blitz_region;
  if (
    (region !== "eu" && region !== "na" && region !== "asia") ||
    p.blitz_account_id == null ||
    !p.blitz_nickname
  ) {
    return null;
  }
  const details =
    p.blitz_stats && typeof p.blitz_stats === "object"
      ? (p.blitz_stats as BlitzAccountDetails)
      : null;
  return {
    region: region as BlitzRegion,
    accountId: Number(p.blitz_account_id),
    nickname: p.blitz_nickname,
    details,
  };
}

// Account (Discord) auth service. This is built on Supabase Auth's native
// Discord OAuth provider and is completely separate from the access-key login
// in AuthService — the two login methods coexist by design.
export class AccountService {
  /**
   * Start the Discord OAuth flow. The browser is redirected to Discord and,
   * after the user authorizes, back to `/dashboard` already signed in. The
   * matching `profiles` row is created automatically by a DB trigger on first
   * sign-in (see the discord_profiles migration), so there is nothing to insert
   * from the client.
   */
  static async signInWithDiscord(): Promise<{ error?: string }> {
    if (typeof window === "undefined") {
      return { error: "Discord sign-in must run in the browser" };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      console.error("Discord sign-in error:", error);
      return { error: error.message };
    }
    return {};
  }

  /** Sign the current Discord account out. */
  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  /**
   * Return the profile of the currently signed-in Discord account, or null if
   * nobody is signed in. The profile row may lag the very first sign-in by a
   * moment (it is created by a trigger), so a single missing row is treated as
   * "not ready yet", not an error.
   */
  static async getMyProfile(): Promise<Profile | null> {
    // getSession() resolves after Supabase has parsed the OAuth redirect hash
    // and reads from local storage (no network round-trip / redirect race).
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;
    // No session => genuinely not signed in. This is the ONLY null path, so a
    // signed-in user is never bounced just because the profile row is missing
    // or the profiles query fails.
    if (!user) return null;

    // Identity straight from the Discord session — always available.
    const meta = user.user_metadata ?? {};
    const fallback: Profile = {
      id: user.id,
      discordId: (meta.provider_id as string) ?? null,
      username:
        (meta.full_name as string) ||
        (meta.name as string) ||
        (meta.user_name as string) ||
        "guest",
      avatarUrl: (meta.avatar_url as string) ?? null,
      role: DEFAULT_ACCOUNT_ROLE,
      roles: [DEFAULT_ACCOUNT_ROLE],
      createdAt: user.created_at ?? new Date().toISOString(),
      wotblitzConsentedAt: null,
      blitz: null,
    };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // Row not created yet (trigger lag) or query blocked/failed (RLS / missing
    // table): still treat the user as signed in using the session identity.
    if (error) {
      console.error("Error fetching profile (using session fallback):", error);
      return fallback;
    }
    if (!data) {
      return fallback;
    }

    const profile = data as SupabaseProfile;
    return {
      id: profile.id,
      discordId: profile.discord_id,
      // The admin-set display name wins, so the member sees the same name
      // everyone else does.
      username: profile.display_name ?? profile.username ?? fallback.username,
      avatarUrl: profile.avatar_url ?? fallback.avatarUrl,
      role: profile.role,
      roles:
        Array.isArray(profile.roles) && profile.roles.length > 0
          ? profile.roles.map((r) => r.toLowerCase())
          : [profile.role.toLowerCase()],
      createdAt: profile.created_at,
      wotblitzConsentedAt: profile.wotblitz_consented_at ?? null,
      blitz: blitzLinkFromProfile(profile),
    };
  }

  /**
   * Consent to WoT Blitz. Promotes a guest to the 'wotblitz' role server-side
   * (other roles are kept) and records the consent time. Returns the new role.
   */
  static async consentWotBlitz(): Promise<{
    success: boolean;
    role: string | null;
    error: string | null;
  }> {
    const { data, error } = await supabase.rpc("consent_wotblitz");
    if (error) return { success: false, role: null, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      role: (d.role as string) ?? null,
      error: (d.error as string) ?? null,
    };
  }

  /** Link (or re-link) the caller's own WoT Blitz account, caching its stats. */
  static async setMyBlitzAccount(
    details: BlitzAccountDetails
  ): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase.rpc("set_my_blitz_account", {
      p_region: details.region,
      p_account_id: details.accountId,
      p_nickname: details.nickname,
      p_stats: details,
    });
    if (error) return { success: false, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return { success: d.success === true, error: (d.error as string) ?? null };
  }

  /** Unlink the caller's WoT Blitz account. */
  static async clearMyBlitzAccount(): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase.rpc("clear_my_blitz_account");
    if (error) return { success: false, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return { success: d.success === true, error: (d.error as string) ?? null };
  }
}
