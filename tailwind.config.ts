import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Extra-small breakpoint for fine-tuning layouts on narrow phones (~320px)
      // before the default `sm` (640px) kicks in. Added on top of the defaults,
      // so existing breakpoints are unchanged.
      screens: {
        xs: "480px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.7" },
        },
        "ticker": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pop": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(-50%, 0) rotate(0deg) scale(1)", opacity: "0.7" },
          "50%": { transform: "translate(-50%, -24px) rotate(8deg) scale(1.08)", opacity: "1" },
        },
        sheen: {
          "0%": { transform: "translateX(-150%) skewX(-12deg)" },
          "60%, 100%": { transform: "translateX(250%) skewX(-12deg)" },
        },
        // Side-to-side "wave" drift for the ambient colour blobs behind the
        // streamer broadcast room. Three variants (different paths + speeds) so
        // the blobs never move in lockstep.
        "wave-x": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(72px,-18px,0) scale(1.12)" },
        },
        "wave-x-rev": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-72px,18px,0) scale(1.08)" },
        },
        "wave-x-slow": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(-56px,12px,0) scale(1.06)" },
          "66%": { transform: "translate3d(56px,-12px,0) scale(1.1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.8s ease-out both",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        shimmer: "shimmer 2.8s ease-in-out infinite",
        "gradient-pan": "gradient-pan 8s ease infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        ticker: "ticker 28s linear infinite",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both",
        pop: "pop 0.45s cubic-bezier(0.22,1,0.36,1) both",
        aurora: "aurora 18s ease-in-out infinite",
        sheen: "sheen 4.5s ease-in-out infinite",
        "wave-x": "wave-x 16s ease-in-out infinite",
        "wave-x-rev": "wave-x-rev 20s ease-in-out infinite",
        "wave-x-slow": "wave-x-slow 24s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;