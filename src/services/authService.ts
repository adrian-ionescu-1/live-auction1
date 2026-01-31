// src/services/authService.ts

import { supabase, SupabaseAuthKey } from '@/lib/supabase';
import { User, UserRole } from '@/types/auction.types';

export class AuthService {
  /**
   * Authenticate user with key
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

      // Check if key is already used
      if (typedAuthKey.used) {
        return { success: false, error: 'This key has already been used' };
      }

      // Mark key as used
      const { error: updateError } = await supabase
        .from('auth_keys')
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('id', typedAuthKey.id);

      if (updateError) {
        console.error('Error marking key as used:', updateError);
        return { success: false, error: 'Failed to authenticate' };
      }

      // Create user in users table
      const initialBalance = typedAuthKey.role === 'USER' ? 10000 : 0;
      
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          username: typedAuthKey.user_name,
          balance: initialBalance,
          role: typedAuthKey.role,
          auth_key_id: typedAuthKey.id,
        })
        .select()
        .single();

      if (userError || !newUser) {
        console.error('Error creating user:', userError);
        return { success: false, error: 'Failed to create user account' };
      }

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
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
}