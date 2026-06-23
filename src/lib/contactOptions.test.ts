import { describe, it, expect } from "vitest";
import {
  CONTACT_TOPICS,
  CONTACT_REASONS,
  TOPIC_VALUES,
  REASON_VALUES,
  GAME_VALUES,
  labelFor,
  DISCORD_HANDLE,
} from "./contactOptions";

describe("contactOptions", () => {
  it("value arrays mirror the option lists", () => {
    expect(TOPIC_VALUES).toEqual(CONTACT_TOPICS.map((t) => t.value));
    expect(REASON_VALUES).toEqual(CONTACT_REASONS.map((r) => r.value));
    expect(GAME_VALUES).toContain("wotblitz");
  });

  it("labelFor resolves a label, falling back to the raw value", () => {
    expect(labelFor(CONTACT_TOPICS, "auctions")).toBe("Auctions");
    expect(labelFor(CONTACT_REASONS, "bug-zzz")).toBe("bug-zzz");
  });

  it("exposes the Discord handle", () => {
    expect(DISCORD_HANDLE).toBe("_the_adrian_");
  });
});
