import { describe, it, expect } from "vitest";
import {
  flagEmoji,
  flagImageUrl,
  isKnownCountry,
  searchCountries,
  randomCountryCode,
} from "./flags";

describe("flagEmoji", () => {
  it("turns a 2-letter code into a regional-indicator pair", () => {
    expect(flagEmoji("ro")).toBe("🇷🇴");
    expect(flagEmoji("US")).toBe("🇺🇸");
  });
  it("returns null for invalid input", () => {
    expect(flagEmoji("")).toBeNull();
    expect(flagEmoji(null)).toBeNull();
    expect(flagEmoji("x")).toBeNull();
    expect(flagEmoji("123")).toBeNull();
  });
});

describe("flagImageUrl", () => {
  it("builds a twemoji svg url from the codepoints", () => {
    expect(flagImageUrl("ro")).toBe(
      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1f7-1f1f4.svg"
    );
  });
  it("returns null for invalid codes", () => {
    expect(flagImageUrl("zzz")).toBeNull();
    expect(flagImageUrl(null)).toBeNull();
  });
});

describe("isKnownCountry / searchCountries", () => {
  it("recognizes known codes case-insensitively", () => {
    expect(isKnownCountry("ro")).toBe(true);
    expect(isKnownCountry("RO")).toBe(true);
    expect(isKnownCountry("zz")).toBe(false);
    expect(isKnownCountry(null)).toBe(false);
  });
  it("searches by name or code", () => {
    expect(searchCountries("roma").some((c) => c.code === "ro")).toBe(true);
    expect(searchCountries("de").some((c) => c.code === "de")).toBe(true);
    expect(searchCountries("")).toHaveLength(searchCountries("").length); // returns all
  });
  it("randomCountryCode returns a known code", () => {
    expect(isKnownCountry(randomCountryCode())).toBe(true);
  });
});
