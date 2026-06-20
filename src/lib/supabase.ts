import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Explicit auth config so the Discord OAuth redirect is handled reliably on a
// purely client-side app: the session token comes back in the URL and the
// client parses + persists it. `implicit` flow avoids the PKCE code-verifier
// round-trip (there is no server callback route here).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});

export interface SupabaseAuthKey {
  id: string;
  key: string;
  role: 'ADMIN' | 'USER' | 'SPECTATOR';
  user_name: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface SupabaseUser {
  id: string;
  username: string;
  balance: number;
  role: 'ADMIN' | 'USER' | 'SPECTATOR';
  auth_key_id: string | null;
  created_at: string;
}

// A real account created by signing in with Discord. Separate from
// SupabaseUser (key-based auction participants) — see the profiles migration.
export interface SupabaseProfile {
  id: string;
  discord_id: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface SupabasePlayer {
  id: string;
  name: string;
  wn8_30d: number;
  winrate: number;
  avg_damage: number;
  base_price: number;
  created_at: string;
}

export interface SupabaseBid {
  id: string;
  player_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export interface SupabaseAuctionState {
  id: string;
  status: string;
  current_player_id: string | null;
  current_player_index: number;
  time_remaining: number;
  countdown: number;
  current_highest_bid_id: string | null;
  current_round: number;
  round_total_players: number;
  round_current_index: number;
  sold_players: string[];
  unsold_players: string[];
  updated_at: string;
}