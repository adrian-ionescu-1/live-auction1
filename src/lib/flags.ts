// Country flags as emoji, plus a searchable country list for the flag picker.
//
// We store a 2-letter ISO 3166-1 alpha-2 code (lowercase, e.g. "ro") on a
// participant/player and render it as an emoji flag at display time. Storing the
// code (not the emoji) keeps it searchable, normalized and font-independent.

export interface Country {
  /** ISO 3166-1 alpha-2 code, lowercase. */
  code: string;
  /** English country name (used for search + the picker label). */
  name: string;
}

/**
 * Turn a 2-letter country code into its emoji flag (regional indicator pair).
 * Returns null for an empty/invalid code so callers can omit the flag slot.
 *
 * NOTE: Windows has no country-flag emoji font, so this renders as the two
 * letters there. For an actual coloured flag use {@link flagImageUrl} / <Flag>.
 */
export function flagEmoji(code: string | null | undefined): string | null {
  if (!code) return null;
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  const A = 0x1f1e6; // regional indicator symbol letter A
  return String.fromCodePoint(
    A + cc.charCodeAt(0) - 65,
    A + cc.charCodeAt(1) - 65,
  );
}

/**
 * A coloured emoji flag image URL (Twemoji SVG) for a country code. Twemoji
 * renders the flag identically on every OS — including Windows, where the emoji
 * font shows only letters — so cards look the same everywhere. Returns null for
 * an invalid code.
 */
export function flagImageUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  const cc = code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return null;
  // Two regional indicator codepoints, lowercase hex, dash-joined (Twemoji name).
  const cp = [...cc]
    .map((ch) => (0x1f1e6 + ch.charCodeAt(0) - 97).toString(16))
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`;
}

// A broad list covering the regions our community plays in. Not exhaustive of
// every territory, but enough that the picker's search feels complete.
export const COUNTRIES: Country[] = [
  { code: "ro", name: "Romania" },
  { code: "md", name: "Moldova" },
  { code: "gb", name: "United Kingdom" },
  { code: "us", name: "United States" },
  { code: "ca", name: "Canada" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "es", name: "Spain" },
  { code: "pt", name: "Portugal" },
  { code: "it", name: "Italy" },
  { code: "nl", name: "Netherlands" },
  { code: "be", name: "Belgium" },
  { code: "lu", name: "Luxembourg" },
  { code: "ie", name: "Ireland" },
  { code: "ch", name: "Switzerland" },
  { code: "at", name: "Austria" },
  { code: "pl", name: "Poland" },
  { code: "cz", name: "Czechia" },
  { code: "sk", name: "Slovakia" },
  { code: "hu", name: "Hungary" },
  { code: "si", name: "Slovenia" },
  { code: "hr", name: "Croatia" },
  { code: "ba", name: "Bosnia and Herzegovina" },
  { code: "rs", name: "Serbia" },
  { code: "me", name: "Montenegro" },
  { code: "mk", name: "North Macedonia" },
  { code: "al", name: "Albania" },
  { code: "bg", name: "Bulgaria" },
  { code: "gr", name: "Greece" },
  { code: "tr", name: "Turkey" },
  { code: "cy", name: "Cyprus" },
  { code: "mt", name: "Malta" },
  { code: "ua", name: "Ukraine" },
  { code: "by", name: "Belarus" },
  { code: "ru", name: "Russia" },
  { code: "lt", name: "Lithuania" },
  { code: "lv", name: "Latvia" },
  { code: "ee", name: "Estonia" },
  { code: "fi", name: "Finland" },
  { code: "se", name: "Sweden" },
  { code: "no", name: "Norway" },
  { code: "dk", name: "Denmark" },
  { code: "is", name: "Iceland" },
  { code: "ge", name: "Georgia" },
  { code: "am", name: "Armenia" },
  { code: "az", name: "Azerbaijan" },
  { code: "kz", name: "Kazakhstan" },
  { code: "uz", name: "Uzbekistan" },
  { code: "tm", name: "Turkmenistan" },
  { code: "kg", name: "Kyrgyzstan" },
  { code: "tj", name: "Tajikistan" },
  { code: "il", name: "Israel" },
  { code: "ps", name: "Palestine" },
  { code: "lb", name: "Lebanon" },
  { code: "jo", name: "Jordan" },
  { code: "sy", name: "Syria" },
  { code: "iq", name: "Iraq" },
  { code: "ir", name: "Iran" },
  { code: "sa", name: "Saudi Arabia" },
  { code: "ae", name: "United Arab Emirates" },
  { code: "qa", name: "Qatar" },
  { code: "kw", name: "Kuwait" },
  { code: "bh", name: "Bahrain" },
  { code: "om", name: "Oman" },
  { code: "ye", name: "Yemen" },
  { code: "eg", name: "Egypt" },
  { code: "ly", name: "Libya" },
  { code: "tn", name: "Tunisia" },
  { code: "dz", name: "Algeria" },
  { code: "ma", name: "Morocco" },
  { code: "sd", name: "Sudan" },
  { code: "ng", name: "Nigeria" },
  { code: "gh", name: "Ghana" },
  { code: "ci", name: "Côte d'Ivoire" },
  { code: "sn", name: "Senegal" },
  { code: "cm", name: "Cameroon" },
  { code: "ke", name: "Kenya" },
  { code: "tz", name: "Tanzania" },
  { code: "ug", name: "Uganda" },
  { code: "et", name: "Ethiopia" },
  { code: "za", name: "South Africa" },
  { code: "zw", name: "Zimbabwe" },
  { code: "zm", name: "Zambia" },
  { code: "ao", name: "Angola" },
  { code: "mz", name: "Mozambique" },
  { code: "in", name: "India" },
  { code: "pk", name: "Pakistan" },
  { code: "bd", name: "Bangladesh" },
  { code: "lk", name: "Sri Lanka" },
  { code: "np", name: "Nepal" },
  { code: "cn", name: "China" },
  { code: "hk", name: "Hong Kong" },
  { code: "tw", name: "Taiwan" },
  { code: "jp", name: "Japan" },
  { code: "kr", name: "South Korea" },
  { code: "kp", name: "North Korea" },
  { code: "mn", name: "Mongolia" },
  { code: "th", name: "Thailand" },
  { code: "vn", name: "Vietnam" },
  { code: "ph", name: "Philippines" },
  { code: "id", name: "Indonesia" },
  { code: "my", name: "Malaysia" },
  { code: "sg", name: "Singapore" },
  { code: "mm", name: "Myanmar" },
  { code: "kh", name: "Cambodia" },
  { code: "la", name: "Laos" },
  { code: "bn", name: "Brunei" },
  { code: "au", name: "Australia" },
  { code: "nz", name: "New Zealand" },
  { code: "fj", name: "Fiji" },
  { code: "pg", name: "Papua New Guinea" },
  { code: "mx", name: "Mexico" },
  { code: "gt", name: "Guatemala" },
  { code: "hn", name: "Honduras" },
  { code: "sv", name: "El Salvador" },
  { code: "ni", name: "Nicaragua" },
  { code: "cr", name: "Costa Rica" },
  { code: "pa", name: "Panama" },
  { code: "cu", name: "Cuba" },
  { code: "do", name: "Dominican Republic" },
  { code: "pr", name: "Puerto Rico" },
  { code: "jm", name: "Jamaica" },
  { code: "tt", name: "Trinidad and Tobago" },
  { code: "co", name: "Colombia" },
  { code: "ve", name: "Venezuela" },
  { code: "ec", name: "Ecuador" },
  { code: "pe", name: "Peru" },
  { code: "bo", name: "Bolivia" },
  { code: "br", name: "Brazil" },
  { code: "py", name: "Paraguay" },
  { code: "uy", name: "Uruguay" },
  { code: "ar", name: "Argentina" },
  { code: "cl", name: "Chile" },
];

const CODE_SET = new Set(COUNTRIES.map((c) => c.code));

/** True when a code maps to a known country in our list. */
export function isKnownCountry(code: string | null | undefined): boolean {
  return !!code && CODE_SET.has(code.trim().toLowerCase());
}

/** Filter the country list by a free-text query (matches name or code). */
export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.includes(q),
  );
}

/** A random country code, used by the "Random flag" affordance. */
export function randomCountryCode(): string {
  return COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)].code;
}
