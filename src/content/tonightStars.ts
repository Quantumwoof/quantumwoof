/**
 * Curated seasonal “tonight’s stars” — no live ephemeris / API keys.
 * Indexed by hemisphere + rough season band from day-of-year.
 */
import type { Hemisphere } from "@/lib/country";
import { dayOfYear } from "@/lib/country";

export type TonightEntry = {
  name: string;
  tip: string;
  kind: "star" | "constellation";
};

type SeasonBand = "dec-feb" | "mar-may" | "jun-aug" | "sep-nov";

function seasonBand(doy: number): SeasonBand {
  // Approximate meteorological seasons in the Northern calendar sense;
  // Southern sky lists below are already season-flipped for that hemisphere.
  if (doy <= 59 || doy >= 335) return "dec-feb";
  if (doy <= 151) return "mar-may";
  if (doy <= 243) return "jun-aug";
  return "sep-nov";
}

const NORTH: Record<SeasonBand, TonightEntry[]> = {
  "dec-feb": [
    {
      name: "Orion",
      tip: "Hunter’s belt — three bright beads. Winter’s easy landmark.",
      kind: "constellation",
    },
    {
      name: "Sirius",
      tip: "Brightest night star. Follow Orion’s belt “down” to find it.",
      kind: "star",
    },
    {
      name: "Aldebaran",
      tip: "Orange eye of Taurus. Chill glow near the Hyades.",
      kind: "star",
    },
    {
      name: "Capella",
      tip: "Golden kite in Auriga — high and friendly on cold evenings.",
      kind: "star",
    },
  ],
  "mar-may": [
    {
      name: "Leo",
      tip: "The sickle (backwards question mark) — spring’s celestial mane.",
      kind: "constellation",
    },
    {
      name: "Arcturus",
      tip: "Follow the Big Dipper’s arc to this orange giant.",
      kind: "star",
    },
    {
      name: "Spica",
      tip: "Spike of wheat under Virgo. Blue-white and tidy.",
      kind: "star",
    },
    {
      name: "Regulus",
      tip: "Heart of the Lion. Steady, not flashy — professor energy.",
      kind: "star",
    },
  ],
  "jun-aug": [
    {
      name: "Summer Triangle",
      tip: "Vega, Deneb, Altair — three bright corners for warm nights.",
      kind: "constellation",
    },
    {
      name: "Vega",
      tip: "Blue-white beacon in Lyra. Almost overhead for mid-north.",
      kind: "star",
    },
    {
      name: "Deneb",
      tip: "Distant swan’s tail. Light left long before huskies existed.",
      kind: "star",
    },
    {
      name: "Altair",
      tip: "Nearby flier in Aquila — quick across the night.",
      kind: "star",
    },
  ],
  "sep-nov": [
    {
      name: "Pegasus",
      tip: "Great Square — autumn’s big window of dark sky.",
      kind: "constellation",
    },
    {
      name: "Fomalhaut",
      tip: "Lonely autumn fish-mouth star, low in the south for many.",
      kind: "star",
    },
    {
      name: "Cassiopeia",
      tip: "The W (or M) of the north. Never sets for mid-northern folks.",
      kind: "constellation",
    },
    {
      name: "Polaris",
      tip: "North star — barely wanders while the rest of the sky turns.",
      kind: "star",
    },
  ],
};

/** Southern lists use local seasons (Dec–Feb = summer there). */
const SOUTH: Record<SeasonBand, TonightEntry[]> = {
  "dec-feb": [
    {
      name: "Southern Cross",
      tip: "Crux — compact kite pointing toward the south celestial pole.",
      kind: "constellation",
    },
    {
      name: "Canopus",
      tip: "Second-brightest star. A calm southern lighthouse.",
      kind: "star",
    },
    {
      name: "Alpha Centauri",
      tip: "Nearest bright neighbor system. Pointers lead you to Crux.",
      kind: "star",
    },
    {
      name: "Achernar",
      tip: "End of the River Eridanus — blazing low for many southern skies.",
      kind: "star",
    },
  ],
  "mar-may": [
    {
      name: "Scorpius",
      tip: "Curved stinger climbing autumn evenings — Antares at the heart.",
      kind: "constellation",
    },
    {
      name: "Antares",
      tip: "Rival of Mars. Red giant with main-character energy.",
      kind: "star",
    },
    {
      name: "Carina",
      tip: "Keel of the old ship Argo. Rich Milky Way country.",
      kind: "constellation",
    },
    {
      name: "Canopus",
      tip: "Still hanging around — hard to miss once you know it.",
      kind: "star",
    },
  ],
  "jun-aug": [
    {
      name: "Orion",
      tip: "Upside-down hunter for southern winter — belt still obvious.",
      kind: "constellation",
    },
    {
      name: "Sirius",
      tip: "Brightest night star, high and proud in southern winter.",
      kind: "star",
    },
    {
      name: "Canopus",
      tip: "Keeps company with Sirius on clear winter nights.",
      kind: "star",
    },
    {
      name: "Rigel",
      tip: "Blue foot of Orion. Cool contrast to Betelgeuse’s orange.",
      kind: "star",
    },
  ],
  "sep-nov": [
    {
      name: "Sagittarius",
      tip: "Teapot asterism — pours toward the galactic center glow.",
      kind: "constellation",
    },
    {
      name: "Scorpius",
      tip: "Still sweeping the evening — follow the curve to the sting.",
      kind: "constellation",
    },
    {
      name: "Fomalhaut",
      tip: "Autumn fish star, friendlier and higher down south.",
      kind: "star",
    },
    {
      name: "Achernar",
      tip: "River’s end — a bright southern companion for spring evenings.",
      kind: "star",
    },
  ],
};

export function getTonightStars(
  hemisphere: Hemisphere,
  date: Date = new Date(),
): TonightEntry[] {
  const band = seasonBand(dayOfYear(date));
  return hemisphere === "south" ? SOUTH[band] : NORTH[band];
}

export function seasonLabel(hemisphere: Hemisphere, date: Date = new Date()): string {
  const band = seasonBand(dayOfYear(date));
  const northLabels: Record<SeasonBand, string> = {
    "dec-feb": "northern winter sky",
    "mar-may": "northern spring sky",
    "jun-aug": "northern summer sky",
    "sep-nov": "northern autumn sky",
  };
  const southLabels: Record<SeasonBand, string> = {
    "dec-feb": "southern summer sky",
    "mar-may": "southern autumn sky",
    "jun-aug": "southern winter sky",
    "sep-nov": "southern spring sky",
  };
  return hemisphere === "south" ? southLabels[band] : northLabels[band];
}
