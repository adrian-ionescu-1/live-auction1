import { describe, it, expect } from "vitest";
import { TEAM_FORMATS, teamFormat } from "./teamFormats";

describe("teamFormats", () => {
  it("exposes the expected formats with starter/reserve counts", () => {
    expect(teamFormat("3v3+1")).toEqual({
      id: "3v3+1",
      label: "3 vs 3 + 1 reserve",
      starters: 3,
      reserves: 1,
    });
    expect(teamFormat("1v1")?.starters).toBe(1);
    expect(teamFormat("7v7+2")?.reserves).toBe(2);
  });

  it("returns null for unknown / empty ids", () => {
    expect(teamFormat(null)).toBeNull();
    expect(teamFormat(undefined)).toBeNull();
    expect(teamFormat("9v9")).toBeNull();
  });

  it("every format has positive starters and non-negative reserves", () => {
    for (const f of TEAM_FORMATS) {
      expect(f.starters).toBeGreaterThan(0);
      expect(f.reserves).toBeGreaterThanOrEqual(0);
    }
  });
});
