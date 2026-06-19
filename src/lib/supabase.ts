import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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