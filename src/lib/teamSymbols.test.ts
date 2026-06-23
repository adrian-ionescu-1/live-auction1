import { describe, it, expect } from "vitest";
import { TEAM_SYMBOLS, isKnownSymbol } from "./teamSymbols";

describe("teamSymbols", () => {
  it("recognizes known symbols", () => {
    expect(isKnownSymbol(TEAM_SYMBOLS[0])).toBe(true);
    expect(isKnownSymbol("🍕")).toBe(false);
    expect(isKnownSymbol(null)).toBe(false);
    expect(isKnownSymbol("")).toBe(false);
  });
  it("has a non-empty, unique palette", () => {
    expect(TEAM_SYMBOLS.length).toBeGreaterThan(0);
    expect(new Set(TEAM_SYMBOLS).size).toBe(TEAM_SYMBOLS.length);
  });
});
