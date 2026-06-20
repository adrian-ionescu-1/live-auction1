import { supabase, SupabaseAuthKey } from '@/lib/supabase';
import { User, UserRole } from '@/types/auction.types';

export class AuthService {
  /**
   * Authenticate user with key (MODIFIED FOR REUSABLE KEYS)
   */
  static async authenticateWithKey(key: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!key || key.trim() === '') {
      return { success: false, error: 'Please enter a key' };
    }

    try {
      // Check if key exists and is valid
      const { data: authKey, error: keyError } = await supabase
        .from('auth_keys')
        .select('*')
        .eq('key', key.trim())
        .single();

      if (keyError || !authKey) {
        return { success: false, error: 'Invalid key' };
      }

      const typedAuthKey = authKey as SupabaseAuthKey;

      // Access keys are now admin-only. Bidders sign in with Discord; only the
      // admin still uses a key. Reject any non-admin key defensively, even if a
      // stray one survived the cleanup migration.
      if (typedAuthKey.role !== 'ADMIN') {
        return { success: false, error: 'Access keys are for admins only. Bidders sign in with Discord.' };
      }

      // MODIFICATION: Check if user already exists with this key
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('*')
        .eq('username', typedAuthKey.user_name)
        .maybeSingle();

      // If user already exists, return the existing user (reusable login)
      if (existingUser && !existingUserError) {
        const user: User = {
          id: existingUser.id,
          username: existingUser.username,
          balance: existingUser.balance,
          role: existingUser.role as UserRole,
          wonPlayers: [],
        };

        // Update the used_at timestamp to track last login
        await supabase
          .from('auth_keys')
          .update({ 
            used: true, 
            used_at: new Date().toISOString() 
          })
          .eq('id', typedAuthKey.id);

        return { success: true, user };
      }

      // Admin key with no user row yet — create the admin participant (no budget;
      // admins don't bid). Only ADMIN keys reach here (guarded above).
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          username: typedAuthKey.user_name,
          balance: 0,
          role: typedAuthKey.role,
          auth_key_id: typedAuthKey.id,
        })
        .select()
        .single();

      if (userError || !newUser) {
        console.error('Error creating user:', userError);
        return { success: false, error: 'Failed to create user account' };
      }

      // Mark key as used (but it's still reusable)
      await supabase
        .from('auth_keys')
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('id', typedAuthKey.id);

      const user: User = {
        id: newUser.id,
        username: newUser.username,
        balance: newUser.balance,
        role: newUser.role as UserRole,
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