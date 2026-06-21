import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types/auction.types';

// sessionStorage key holding the access-key admin's key after login. The admin
// is anonymous to Postgres (no JWT), so the guarded admin RPCs need the key as
// proof; we keep it here and forward it on each admin write. Cleared on logout.
export const ADMIN_KEY_STORAGE = 'admin_access_key';

export class AuthService {
  /**
   * Authenticate user with key (MODIFIED FOR REUSABLE KEYS)
   */
  static async authenticateWithKey(key: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!key || key.trim() === '') {
      return { success: false, error: 'Please enter a key' };
    }

    try {
      // The login (validate the key, reuse/create the admin participant, mark the
      // key used) runs server-side in the key_login SECURITY DEFINER RPC, so the
      // anon client no longer writes auth_keys / users directly (RLS hardening).
      const { data, error } = await supabase.rpc('key_login', { p_key: key.trim() });
      if (error) {
        console.error('Authentication error:', error);
        return { success: false, error: 'Authentication failed' };
      }

      const result = (data ?? {}) as {
        success?: boolean;
        error?: string;
        user_id?: string;
        username?: string;
        balance?: number;
        role?: string;
      };

      if (!result.success || !result.user_id) {
        return { success: false, error: result.error ?? 'Authentication failed' };
      }

      // Keep the key so the guarded admin RPCs can prove this anonymous caller
      // really is the access-key admin (see ADMIN_KEY_STORAGE).
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
      }

      const user: User = {
        id: result.user_id,
        username: result.username ?? 'Admin',
        balance: result.balance ?? 0,
        role: (result.role as UserRole) ?? 'ADMIN',
        wonPlayers: [],
      };

      return { success: true, user };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Check if user exists by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        balance: data.balance,
        role: data.role as UserRole,
        wonPlayers: [],
        banned: !!data.banned,
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
}