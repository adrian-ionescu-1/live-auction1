import { describe, it, expect } from "vitest";
import { calcReserve, DEFAULT_RESERVE_PER_PLAYER } from "./auctionRules";

describe("calcReserve", () => {
  it("multiplies remaining slots by the per-player reserve", () => {
    expect(calcReserve(3, 100)).toBe(300);
    expect(calcReserve(0, 100)).toBe(0);
  });
  it("never goes negative", () => {
    expect(calcReserve(-5, 100)).toBe(0);
  });
  it("falls back to the default reserve", () => {
    expect(calcReserve(2)).toBe(2 * DEFAULT_RESERVE_PER_PLAYER);
  });
});
