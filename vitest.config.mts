import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// .mts so the ESM-only @vitejs/plugin-react loads correctly (the project's
// package.json is CommonJS). jsdom for component tests; the "@/..." alias mirrors
// tsconfig. Tests import { describe, it, expect } from "vitest" (no globals), so
// the Next tsconfig stays untouched.
export default defineConfig({
  plugins: [react()],
  // Use the automatic JSX runtime so components don't need `import React`.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
