import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The access-key admin is anonymous to Postgres (no JWT), so the guarded admin
// RPCs recognise them by an `x-admin-key` header carrying the key they logged in
// with. Inject it on every request when present, so admin event RPCs (which take
// no key argument) are authorized without threading the key through each call.
// Harmless for everyone else: no key in storage means no header.
const adminKeyFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (typeof window !== 'undefined') {
    const key = window.sessionStorage.getItem('admin_access_key');
    if (key) headers.set('x-admin-key', key);
  }
  return fetch(input, { ...init, headers });
};

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
  global: { fetch: adminKeyFetch },
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
  /** Admin-set display name override; null = use username. */
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabasePlayer {
  id: string;
  name: string;
  wn8_30d: number;
  battles: number;
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
  // The named event the single live auction is currently bound to.
  event_id: string | null;
  updated_at: string;
}

// A named auction event (licitație). The reserve fields are derived and stored
// by admin_create_event: reserve_per_player = entry_fee + margin, and
// total_reserve = player_limit * reserve_per_player.
export interface SupabaseAuctionEvent {
  id: string;
  name: string;
  player_limit: number;
  entry_fee: number;
  margin: number;
  reserve_per_player: number;
  total_reserve: number;
  member_budget: number;
  player_duration: number;
  extend_threshold: number;
  extend_amount: number;
  bid_start: number;
  bid_increments: number[];
  status: "live" | "finished";
  created_at: string;
  available_at: string | null;
  finished_at: string | null;
}