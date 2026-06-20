import { supabase } from "@/lib/supabase";
import { Member } from "@/types/account.types";

// Reads the member directory (Discord accounts) for the admin views. Reads are
// allowed by the profiles_select_all policy; we only select non-sensitive
// columns. Role/ban writes are intentionally not done here (service role only).
export class MembersService {
  static async getAllMembers(): Promise<Member[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, role, banned")
      .order("username", { ascending: true });

    if (error) {
      console.error("Error loading members:", error);
      return [];
    }

    return (data ?? []).map((row) => {
      const r = row as {
        id: string;
        username: string | null;
        avatar_url: string | null;
        role: string;
        banned: boolean | null;
      };
      return {
        id: r.id,
        username: r.username ?? "guest",
        avatarUrl: r.avatar_url,
        role: r.role,
        banned: !!r.banned,
      };
    });
  }

  /** Admin: change a member's role. Returns true on success. */
  static async setRole(memberId: string, role: string): Promise<boolean> {
    const { error } = await supabase.rpc("admin_set_member_role", {
      p_member_id: memberId,
      p_role: role,
    });
    if (error) {
      console.error("Error updating member role:", error);
      return false;
    }
    return true;
  }

  /** Admin: ban / unban a member. Returns true on success. */
  static async setBanned(memberId: string, banned: boolean): Promise<boolean> {
    const { error } = await supabase.rpc("admin_set_member_banned", {
      p_member_id: memberId,
      p_banned: banned,
    });
    if (error) {
      console.error("Error updating member ban state:", error);
      return false;
    }
    return true;
  }
}
