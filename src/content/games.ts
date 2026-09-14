export type StarPoint = {
  id: number;
  x: number; // 0–100 viewBox percent
  y: number;
  label?: string;
};

export type Constellation = {
  id: string;
  name: string;
  hint: string;
  stars: StarPoint[];
  fact: string;
  /** Draw a closing segment when the outline is finished */
  closeLoop?: boolean;
  /** Short blurb for the picker card */
  shapeNote?: string;
};

/**
 * Curated classic connect graphs — familiar textbook shapes, not live alt/az.
 * Coords sit in the upper ~70% so the playable stars clear the caption strip.
 * IDs align with `CATALOG_CONSTELLATIONS` in skyCatalog.
 */
export const STYLIZED_CONSTELLATIONS: Constellation[] = [
  {
    id: "orion",
    name: "Orion",
    shapeNote: "Hunter — shoulders, belt, feet",
    hint: "Start at Betelgeuse, cross to Bellatrix, walk the belt, then the feet.",
    stars: [
      { id: 1, x: 32, y: 22, label: "Betelgeuse" },
      { id: 2, x: 68, y: 24, label: "Bellatrix" },
      { id: 3, x: 58, y: 40, label: "Mintaka" },
      { id: 4, x: 50, y: 42, label: "Alnilam" },
      { id: 5, x: 42, y: 44, label: "Alnitak" },
      { id: 6, x: 38, y: 62, label: "Saiph" },
      { id: 7, x: 62, y: 64, label: "Rigel" },
    ],
    fact: "Orion’s belt is three bright beads — a winter landmark up north, winter high down south.",
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    shapeNote: "The classic northern W",
    hint: "The W (or M) of the north. Trace the zigzag.",
    stars: [
      { id: 1, x: 16, y: 32, label: "Caph" },
      { id: 2, x: 34, y: 52, label: "Schedar" },
      { id: 3, x: 50, y: 26, label: "γ Cas" },
      { id: 4, x: 66, y: 50, label: "Ruchbah" },
      { id: 5, x: 84, y: 30, label: "Segin" },
    ],
    fact: "Cassiopeia never sets for mid-northern latitudes — a reliable W when the Big Dipper dips low.",
  },
  {
    id: "ursa-minor",
    name: "Ursa Minor",
    shapeNote: "Little Dipper — Polaris at the tip",
    hint: "Start at Polaris — the tip of the handle — then stroll the little dipper.",
    stars: [
      { id: 1, x: 18, y: 58, label: "Polaris" },
      { id: 2, x: 32, y: 50 },
      { id: 3, x: 46, y: 44 },
      { id: 4, x: 58, y: 38 },
      { id: 5, x: 68, y: 24, label: "Kochab" },
      { id: 6, x: 82, y: 30, label: "Pherkad" },
      { id: 7, x: 74, y: 44 },
    ],
    fact: "Polaris sits nearly above Earth’s north axis — a quiet lighthouse for night navigators.",
  },
  {
    id: "crux",
    name: "Southern Cross",
    shapeNote: "Compact southern kite",
    hint: "Compact kite. Acrux to Gacrux, then the cross-beam.",
    closeLoop: true,
    stars: [
      { id: 1, x: 50, y: 62, label: "Acrux" },
      { id: 2, x: 50, y: 22, label: "Gacrux" },
      { id: 3, x: 72, y: 40, label: "Mimosa" },
      { id: 4, x: 28, y: 42, label: "δ Cru" },
    ],
    fact: "Crux points toward the south celestial pole — the southern sky’s pocket compass.",
  },
  {
    id: "leo",
    name: "Leo",
    shapeNote: "Sickle mane + haunch",
    hint: "Regulus first — heart of the Lion — then the sickle and the haunch.",
    stars: [
      { id: 1, x: 28, y: 48, label: "Regulus" },
      { id: 2, x: 36, y: 28, label: "Algieba" },
      { id: 3, x: 58, y: 26, label: "Zosma" },
      { id: 4, x: 52, y: 44, label: "Chertan" },
      { id: 5, x: 82, y: 40, label: "Denebola" },
    ],
    fact: "Leo’s sickle looks like a backwards question mark — spring’s celestial mane up north.",
  },
  {
    id: "scorpius",
    name: "Scorpius",
    shapeNote: "Claws → Antares → sting",
    hint: "Start near the claws, find red Antares, then curve to the sting.",
    stars: [
      { id: 1, x: 22, y: 24, label: "Graffias" },
      { id: 2, x: 34, y: 32, label: "Dschubba" },
      { id: 3, x: 46, y: 40, label: "Antares" },
      { id: 4, x: 62, y: 52, label: "Sargas" },
      { id: 5, x: 78, y: 58, label: "Shaula" },
      { id: 6, x: 84, y: 48, label: "Lesath" },
    ],
    fact: "Antares means rival of Mars — a red giant with main-character energy.",
  },
  {
    id: "summer-triangle",
    name: "Summer Triangle",
    shapeNote: "Vega · Deneb · Altair",
    hint: "Three bright corners: Vega, Deneb, Altair. Tap each once.",
    closeLoop: true,
    stars: [
      { id: 1, x: 50, y: 18, label: "Vega" },
      { id: 2, x: 22, y: 58, label: "Deneb" },
      { id: 3, x: 78, y: 62, label: "Altair" },
    ],
    fact: "Vega, Deneb, and Altair frame warm northern evenings — easy even under city glow.",
  },
  {
    id: "pegasus",
    name: "Great Square",
    shapeNote: "Autumn’s four-corner window",
    hint: "Four corners of autumn’s big window. Trace the square.",
    closeLoop: true,
    stars: [
      { id: 1, x: 28, y: 58, label: "Markab" },
      { id: 2, x: 28, y: 24, label: "Scheat" },
      { id: 3, x: 72, y: 24, label: "Alpheratz" },
      { id: 4, x: 72, y: 58, label: "Algenib" },
    ],
    fact: "The Great Square of Pegasus is autumn’s dark-sky picture frame.",
  },
  {
    id: "sagittarius",
    name: "Sagittarius",
    shapeNote: "Teapot asterism",
    hint: "Teapot asterism — spout, handle, then the lid.",
    closeLoop: true,
    stars: [
      { id: 1, x: 22, y: 48, label: "Kaus Aus." },
      { id: 2, x: 38, y: 42, label: "Kaus Med." },
      { id: 3, x: 48, y: 28, label: "Kaus Bor." },
      { id: 4, x: 68, y: 36, label: "Nunki" },
      { id: 5, x: 62, y: 54, label: "Ascella" },
    ],
    fact: "The teapot pours toward the galactic center glow on clear southern/mid-latitude nights.",
  },
  {
    id: "canis-major",
    name: "Canis Major",
    shapeNote: "Sirius + the dog outline",
    hint: "Sirius first — brightest night star — then the dog’s outline.",
    stars: [
      { id: 1, x: 42, y: 28, label: "Sirius" },
      { id: 2, x: 22, y: 40, label: "Mirzam" },
      { id: 3, x: 58, y: 58, label: "Adhara" },
      { id: 4, x: 68, y: 44, label: "Wezen" },
    ],
    fact: "Follow Orion’s belt “down” to Sirius. Hard to miss once you know the trick.",
  },
];

/** @deprecated Prefer STYLIZED_CONSTELLATIONS — kept as the tiny classic seasonal fallback set. */
export const constellations: Constellation[] = [
  STYLIZED_CONSTELLATIONS.find((c) => c.id === "ursa-minor")!,
  {
    id: "orion-belt",
    name: "Orion's Belt",
    shapeNote: "Three belt beads + feet",
    hint: "Three bright beads in a nearly straight line. Order left to right.",
    stars: [
      { id: 1, x: 22, y: 40, label: "Alnitak" },
      { id: 2, x: 50, y: 38, label: "Alnilam" },
      { id: 3, x: 78, y: 36, label: "Mintaka" },
      { id: 4, x: 62, y: 58, label: "Saiph" },
      { id: 5, x: 38, y: 62, label: "Rigel" },
    ],
    fact: "Orion's Belt points south toward Sirius in winter skies — a handy sky compass.",
  },
  STYLIZED_CONSTELLATIONS.find((c) => c.id === "cassiopeia")!,
];

export function getStylizedById(id: string): Constellation | undefined {
  return STYLIZED_CONSTELLATIONS.find((c) => c.id === id);
}

/** Deterministic decorative field stars for finish morph (classic boards). */
export function stylizedFieldStars(seed: string): { x: number; y: number; r: number }[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 18; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const x = 6 + (h % 880) / 10;
    h = (h * 1664525 + 1013904223) >>> 0;
    const y = 6 + (h % 620) / 10; // keep above caption band
    h = (h * 1664525 + 1013904223) >>> 0;
    const r = 0.28 + (h % 40) / 100;
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r });
  }
  return out;
}

export const photonTips = [
  "Photons do not hurry for applause. Catch what you can; note what you miss.",
  "Timing is a measurement. The universe keeps the stopwatch.",
  "A good catch is data. A miss is also data — quieter, but useful.",
];
