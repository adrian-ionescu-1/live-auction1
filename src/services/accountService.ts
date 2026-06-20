import { supabase, SupabaseProfile } from "@/lib/supabase";
import { Profile, DEFAULT_ACCOUNT_ROLE } from "@/types/account.types";

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
      createdAt: user.created_at ?? new Date().toISOString(),
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
      username: profile.username ?? fallback.username,
      avatarUrl: profile.avatar_url ?? fallback.avatarUrl,
      role: profile.role,
      createdAt: profile.created_at,
    };
  }
}
