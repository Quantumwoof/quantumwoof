/**
 * Connect-the-dots paths for a handful of well-known constellations / asterisms.
 * Spans both hemispheres; path order is the playable sequence (unique stars).
 */

export type CatalogConstellation = {
  id: string;
  name: string;
  hint: string;
  fact: string;
  /** Star ids in connect order (unique) */
  path: string[];
  /** When true, draw a closing segment on the finished outline */
  closeLoop?: boolean;
  /** Optional tip aliases matched against tonightStars names */
  tonightAliases?: string[];
};

export const CATALOG_CONSTELLATIONS: CatalogConstellation[] = [
  {
    id: "orion",
    name: "Orion",
    hint: "Start at Betelgeuse, cross to Bellatrix, walk the belt, then the feet.",
    fact: "Orion’s belt is three bright beads — a winter landmark up north, winter high down south.",
    path: ["betelgeuse", "bellatrix", "mintaka", "alnilam", "alnitak", "saiph", "rigel"],
    tonightAliases: ["Orion", "Orion's Belt"],
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    hint: "The W (or M) of the north. Trace the zigzag.",
    fact: "Cassiopeia never sets for mid-northern latitudes — a reliable W when the Big Dipper dips low.",
    path: ["caph", "schedar", "gammaCas", "ruchbah", "segin"],
    tonightAliases: ["Cassiopeia"],
  },
  {
    id: "ursa-minor",
    name: "Ursa Minor",
    hint: "Start at Polaris — the tip of the handle — then stroll the little dipper.",
    fact: "Polaris sits nearly above Earth’s north axis — a quiet lighthouse for night navigators.",
    path: ["polaris", "yildun", "epsUMi", "zetaUMi", "kochab", "pherkad", "etaUMi"],
    tonightAliases: ["Polaris", "Ursa Minor"],
  },
  {
    id: "crux",
    name: "Southern Cross",
    hint: "Compact kite. Acrux to Gacrux, then the cross-beam.",
    fact: "Crux points toward the south celestial pole — the southern sky’s pocket compass.",
    path: ["acrux", "gacrux", "mimosa", "deltaCru"],
    closeLoop: true,
    tonightAliases: ["Southern Cross", "Crux"],
  },
  {
    id: "leo",
    name: "Leo",
    hint: "Regulus first — heart of the Lion — then the sickle and the haunch.",
    fact: "Leo’s sickle looks like a backwards question mark — spring’s celestial mane up north.",
    path: ["regulus", "algieba", "zosma", "chertan", "denebola"],
    tonightAliases: ["Leo", "Regulus"],
  },
  {
    id: "scorpius",
    name: "Scorpius",
    hint: "Start near the claws, find red Antares, then curve to the sting.",
    fact: "Antares means rival of Mars — a red giant with main-character energy.",
    path: ["graffias", "dschubba", "antares", "sargas", "shaula", "lesath"],
    tonightAliases: ["Scorpius", "Antares"],
  },
  {
    id: "summer-triangle",
    name: "Summer Triangle",
    hint: "Three bright corners: Vega, Deneb, Altair. Tap each once.",
    fact: "Vega, Deneb, and Altair frame warm northern evenings — easy even under city glow.",
    path: ["vega", "deneb", "altair"],
    closeLoop: true,
    tonightAliases: ["Summer Triangle", "Vega", "Deneb", "Altair"],
  },
  {
    id: "pegasus",
    name: "Great Square",
    hint: "Four corners of autumn’s big window. Trace the square.",
    fact: "The Great Square of Pegasus is autumn’s dark-sky picture frame.",
    path: ["markab", "scheat", "alpheratz", "algenib"],
    closeLoop: true,
    tonightAliases: ["Pegasus"],
  },
  {
    id: "sagittarius",
    name: "Sagittarius",
    hint: "Teapot asterism — spout, handle, then the lid.",
    fact: "The teapot pours toward the galactic center glow on clear southern/mid-latitude nights.",
    path: ["kausAus", "kausMed", "kausBor", "narkab", "ascella"],
    closeLoop: true,
    tonightAliases: ["Sagittarius"],
  },
  {
    id: "canis-major",
    name: "Canis Major",
    hint: "Sirius first — brightest night star — then the dog’s outline.",
    fact: "Follow Orion’s belt “down” to Sirius. Hard to miss once you know the trick.",
    path: ["sirius", "mirzam", "adhara", "wezen"],
    tonightAliases: ["Sirius", "Canis Major"],
  },
];
