// Types for real accounts created via Discord sign-in. Kept separate from
// auction.types.ts (key-based auction participants) because this is a distinct
// domain: persistent accounts with an admin-assigned role.

export interface Profile {
  id: string;
  discordId: string | null;
  username: string;
  avatarUrl: string | null;
  /**
   * Free-text role. Every new account starts as 'guest' and an admin promotes
   * it manually (e.g. to 'prime'). Kept as a string so admins can introduce new
   * roles without a code change.
   */
  role: string;
  createdAt: string;
}

/** The default role every Discord account receives until an admin changes it. */
export const DEFAULT_ACCOUNT_ROLE = "guest";
