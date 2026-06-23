// Flat ESLint config (ESLint 9 + Next 16). Next 16's eslint-config-next ships a
// native flat-config array, so we spread it directly (no FlatCompat bridge).
// Run with `npm run lint` (eslint .).

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      // Root tooling config files — not application code.
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "postcss.config.js",
      "prettier.config.js",
    ],
  },
  ...nextCoreWebVitals,
  {
    // Next 16 enables the React-Compiler-oriented react-hooks rules by default.
    // They flag idiomatic patterns this codebase relies on (setState after an
    // async fetch in an effect, Date.now() in a memo, small components defined
    // inline). They are advisory, not bugs — turned off to keep the pre-upgrade
    // lint baseline. Revisit if/when adopting the React Compiler.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default config;
