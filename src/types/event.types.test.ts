import { describe, it, expect } from "vitest";
import { reserveForSlots } from "./event.types";

describe("reserveForSlots", () => {
  it("reserves per remaining slot", () => {
    expect(reserveForSlots(4, 110)).toBe(440);
  });
  it("clamps negative slot counts to zero", () => {
    expect(reserveForSlots(-2, 110)).toBe(0);
  });
});
