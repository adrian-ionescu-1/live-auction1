// Adds the jest-dom matchers (toBeInTheDocument, toHaveTextContent, …) to
// Vitest's expect, and unmounts rendered components after each test. The manual
// cleanup is needed because we run without Vitest globals, so RTL's automatic
// afterEach hook isn't registered on its own.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
