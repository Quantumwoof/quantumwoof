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
};

export const constellations: Constellation[] = [
  {
    id: "ursa-minor",
    name: "Ursa Minor",
    hint: "Start at the tip of the handle — Polaris holds still while the rest turns.",
    stars: [
      { id: 1, x: 18, y: 62, label: "Polaris" },
      { id: 2, x: 32, y: 54 },
      { id: 3, x: 46, y: 48 },
      { id: 4, x: 58, y: 42 },
      { id: 5, x: 68, y: 28 },
      { id: 6, x: 82, y: 34 },
      { id: 7, x: 74, y: 48 },
    ],
    fact: "Polaris sits nearly above Earth's north axis — a quiet lighthouse for night navigators.",
  },
  {
    id: "orion-belt",
    name: "Orion's Belt",
    hint: "Three bright beads in a nearly straight line. Order left to right.",
    stars: [
      { id: 1, x: 22, y: 48, label: "Alnitak" },
      { id: 2, x: 50, y: 44, label: "Alnilam" },
      { id: 3, x: 78, y: 40, label: "Mintaka" },
      { id: 4, x: 62, y: 68, label: "Saiph" },
      { id: 5, x: 38, y: 72, label: "Rigel" },
    ],
    fact: "Orion's Belt points south toward Sirius in winter skies — a handy sky compass.",
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    hint: "The W (or M) of the north. Trace the zigzag.",
    stars: [
      { id: 1, x: 16, y: 38 },
      { id: 2, x: 34, y: 58 },
      { id: 3, x: 50, y: 32 },
      { id: 4, x: 66, y: 56 },
      { id: 5, x: 84, y: 36 },
    ],
    fact: "Cassiopeia never sets for mid-northern latitudes — a reliable W when the Big Dipper dips low.",
  },
];

export const photonTips = [
  "Photons do not hurry for applause. Catch what you can; note what you miss.",
  "Timing is a measurement. The universe keeps the stopwatch.",
  "A good catch is data. A miss is also data — quieter, but useful.",
];
