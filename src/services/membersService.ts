import { supabase } from "@/lib/supabase";
import { Member } from "@/types/account.types";
import { ADMIN_KEY_STORAGE } from "@/services/authService";

// The access-key admin's key (if they logged in with one). Discord admins return
// null here and are authorized by their JWT instead. Sent to the guarded RPCs as
// p_admin_key so the server can verify the caller is really an admin.
function adminKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

// Reads the member directory (Discord accounts) for the admin views. Reads are
// allowed by the profiles_select_all policy; we only select non-sensitive
// columns. Role/ban writes are intentionally not done here (service role only).
export class MembersService {
  static async getAllMembers(): Promise<Member[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, roles, banned, default_country")
      .order("username", { ascending: true });

    if (error) {
      console.error("Error loading members:", error);
      return [];
    }

    return (data ?? []).map((row) => {
      const r = row as {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
        role: string;
        roles: string[] | null;
        banned: boolean | null;
        default_country: string | null;
      };
      const original = r.username ?? "guest";
      const displayName = r.display_name ?? null;
      return {
        id: r.id,
        username: displayName ?? original,
        originalUsername: original,
        displayName,
        avatarUrl: r.avatar_url,
        role: r.role,
        roles:
          Array.isArray(r.roles) && r.roles.length > 0
            ? r.roles.map((x) => x.toLowerCase())
            : [r.role.toLowerCase()],
        banned: !!r.banned,
        defaultCountry: r.default_country ?? null,
      };
    });
  }

  /** Admin: replace a member's roles with a single one. Returns true on success. */
  static async setRole(memberId: string, role: string): Promise<boolean> {
    const { error } = await supabase.rpc("admin_set_member_role", {
      p_member_id: memberId,
      p_role: role,
      p_admin_key: adminKey(),
    });
    if (error) {
      console.error("Error updating member role:", error);
      return false;
    }
    return true;
  }

  /** Admin: grant one role to a member, keeping the others. */
  static async addRole(memberId: string, role: string): Promise<boolean> {
    const { error } = await supabase.rpc("admin_add_member_role", {
      p_member_id: memberId,
      p_role: role,
      p_admin_key: adminKey(),
    });
    if (error) {
      console.error("Error adding member role:", error);
      return false;
    }
    return true;
  }

  /** Admin: revoke one role from a member (empty set falls back to guest). */
  static async removeRole(memberId: string, role: string): Promise<boolean> {
    const { error } = await supabase.rpc("admin_remove_member_role", {
      p_member_id: memberId,
      p_role: role,
      p_admin_key: adminKey(),
    });
    if (error) {
      console.error("Error removing member role:", error);
      return false;
    }
    return true;
  }

  /** Admin: ban / unban a member. Returns true on success. */
  static async setBanned(memberId: string, banned: boolean): Promise<boolean> {
    const { error } = await supabase.rpc("admin_set_member_banned", {
      p_member_id: memberId,
      p_banned: banned,
      p_admin_key: adminKey(),
    });
    if (error) {
      console.error("Error updating member ban state:", error);
      return false;
    }
    return true;
  }

  /**
   * Admin: permanently delete a member (removes them from the directory and
   * clears their role). If they sign in with Discord again they come back as a
   * brand-new 'guest'. Returns true on success.
   */
  static async deleteMember(memberId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("admin_delete_member", {
      p_member_id: memberId,
    });
    if (error) {
      console.error("Error deleting member:", error);
      return false;
    }
    // The RPC returns { success, error } — treat an explicit failure as false.
    if (data && typeof data === "object" && data.success === false) {
      console.error("Error deleting member:", data.error);
      return false;
    }
    return true;
  }

  /** Admin: set a member's default country tag (ISO alpha-2), or clear it. */
  static async setCountry(memberId: string, country: string | null): Promise<boolean> {
    const { error } = await supabase.rpc("admin_set_member_country", {
      p_member_id: memberId,
      p_country: country,
      p_admin_key: adminKey(),
    });
    if (error) {
      console.error("Error updating member country:", error);
      return false;
    }
    return true;
  }

  /**
   * Admin: set a member's display name, or reset it (pass null/empty) back to
   * their original Discord name. Also syncs the live auction participant.
   */
  static async setName(memberId: string, name: string | null): Promise<boolean> {
    const { error } = await supabase.rpc("admin_set_member_name", {
      p_member_id: memberId,
      p_name: name && name.trim() ? name.trim() : null,
      p_admin_key: adminKey(),
    });
    if (error) {
      console.error("Error updating member name:", error);
      return false;
    }
    return true;
  }
}
