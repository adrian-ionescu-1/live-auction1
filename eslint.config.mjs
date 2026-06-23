// Flat ESLint config (ESLint 9). Replaces the old `.eslintrc.json` + `next lint`,
// which Next 15 deprecated and Next 16 removes. We bridge the Next shareable
// config ("next/core-web-vitals") via FlatCompat to keep the exact same rules.
// Run with `npm run lint` (eslint .).

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

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
  ...compat.extends("next/core-web-vitals"),
];

export default config;
