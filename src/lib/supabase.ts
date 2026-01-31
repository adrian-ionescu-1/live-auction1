import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface SupabaseUser {
  id: string
  username: string
  balance: number
  is_admin: boolean
  created_at: string
}

export interface SupabasePlayer {
  id: string
  name: string
  role: string
  rating: number
  image: string
  base_price: number
  created_at: string
}

export interface SupabaseBid {
  id: string
  player_id: string
  user_id: string
  amount: number
  created_at: string
}

export interface SupabaseAuctionState {
  id: string
  status: string
  current_player_id: string | null
  current_player_index: number
  time_remaining: number
  countdown: number
  current_highest_bid_id: string | null
  // 🔥 NEW: Progress tracking fields
  current_round: number
  round_total_players: number
  round_current_index: number
  updated_at: string
}