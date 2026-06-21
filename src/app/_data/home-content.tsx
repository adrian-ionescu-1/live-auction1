import type { ShowcasePlayer } from "../_components/PlayerShowcaseCard";

export const TICKER = [
  "LIVE BIDDING",
  "REAL-TIME SYNC",
  "ANTI-SPAM",
  "8 TEAMS",
  "$10,000 BUDGET",
  "10 PICKS",
  "RE-AUCTION",
  "FAIR PLAY",
  "STREAMER BROADCAST",
  "WOT BLITZ",
];

export const STATS = [
  { v: "8", k: "Teams per draft" },
  { v: "$10K", k: "Budget each" },
  { v: "10", k: "Pick cap" },
  { v: "0ms", k: "Desync goal" },
];

export const STEPS = [
  {
    n: "01",
    title: "Get your access key",
    desc: "Organizers hand out keys. One key = one seat at the draft table.",
    icon: (
      <path d="M14 7a4 4 0 1 0-3.5 3.97L7 14.5V17H9.5l.5-.5H12v-2h2l1-1A4 4 0 0 0 14 7Zm2 1.5h.01" />
    ),
    glow: "shadow-[0_0_60px_rgba(16,185,129,0.12)]",
  },
  {
    n: "02",
    title: "Enter the live draft",
    desc: "Join the room and see the same timer, player and bids as everyone else.",
    icon: <path d="M5 12h14M13 6l6 6-6 6" />,
    glow: "shadow-[0_0_60px_rgba(34,211,238,0.12)]",
  },
  {
    n: "03",
    title: "Bid in real time",
    desc: "Outbid rivals before the clock hits zero. Anti-spam keeps it fair.",
    icon: <path d="M5 19h8M14 4l6 6-5 5-6-6 5-5ZM9 9l-5 5 2 2 5-5" />,
    glow: "shadow-[0_0_60px_rgba(236,72,153,0.10)]",
  },
  {
    n: "04",
    title: "Build your roster",
    desc: "Win players, track your budget, and assemble the strongest squad.",
    icon: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Zm-2 9 1.5 1.5L15 10" />,
    glow: "shadow-[0_0_60px_rgba(255,255,255,0.08)]",
  },
];

export const PLAYERS: ShowcasePlayer[] = [
  {
    name: "Steel Wolf",
    handle: "@steel_wolf",
    role: "Heavy / Frontline",
    rating: 94,
    tier: "legendary",
    basePrice: 220,
    stats: [
      { label: "WN8", value: 96 },
      { label: "Winrate", value: 71 },
      { label: "Avg DMG", value: 88 },
    ],
  },
  {
    name: "Iron Maiden",
    handle: "@iron_maiden",
    role: "Medium / Flex",
    rating: 89,
    tier: "epic",
    basePrice: 160,
    stats: [
      { label: "WN8", value: 90 },
      { label: "Winrate", value: 64 },
      { label: "Avg DMG", value: 82 },
    ],
  },
  {
    name: "Night Hawk",
    handle: "@night_hawk",
    role: "Sniper / TD",
    rating: 86,
    tier: "rare",
    basePrice: 130,
    stats: [
      { label: "WN8", value: 84 },
      { label: "Winrate", value: 61 },
      { label: "Avg DMG", value: 90 },
    ],
  },
  {
    name: "Ghost Recon",
    handle: "@ghost_recon",
    role: "Light / Scout",
    rating: 88,
    tier: "epic",
    basePrice: 150,
    stats: [
      { label: "WN8", value: 87 },
      { label: "Winrate", value: 66 },
      { label: "Avg DMG", value: 74 },
    ],
  },
];

export const FEATURES = [
  {
    title: "Real-time sync",
    desc: "All clients stay aligned with live updates — no refresh, no drift.",
    href: "/tournaments",
    glow: "shadow-[0_0_60px_rgba(34,211,238,0.10)]",
    cta: "Tournament format →",
  },
  {
    title: "Fair bidding flow",
    desc: "Anti-spam and pace control keep the auction meaningful.",
    href: "/rules",
    glow: "shadow-[0_0_60px_rgba(16,185,129,0.10)]",
    cta: "Read rules →",
  },
  {
    title: "Squad overview",
    desc: "Track roster, purchases, and remaining budget in one place.",
    href: "/tournaments",
    glow: "shadow-[0_0_60px_rgba(236,72,153,0.08)]",
    cta: "Tournament format →",
  },
];

export const FAQ_PREVIEW = [
  {
    q: "What if two users bid at the same time?",
    a: "The server validates bids in order and broadcasts the result in real time.",
  },
  {
    q: "What happens if a participant disconnects?",
    a: "They can reconnect and continue — auction state remains live for all users.",
  },
  {
    q: "Can people watch the auction live?",
    a: "Yes — community members with the Streamer role broadcast the live draft on YouTube, Twitch or TikTok.",
  },
];
