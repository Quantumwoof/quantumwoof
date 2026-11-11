import type { SpectralId } from "@/lib/starform/config";

/** One-line real astronomy per spectral class + what it leaves behind. */
export const STAR_TEACH: Record<SpectralId, { name: string; fact: string; remnant: string }> = {
  O: {
    name: "Blue giant",
    fact: "O stars are 16+ times the Sun's mass, burn blue-hot and live only a few million years.",
    remnant: "Their cores collapse into black holes (or neutron stars) in a supernova. In the game your black hole trails you like an escort, swallowing hazards near it — it never pulls in you or your gas.",
  },
  B: {
    name: "Blue-white star",
    fact: "B stars (about 2–16 Suns) shine fiercely, like Spica, and live tens of millions of years.",
    remnant: "The heavier ones explode and leave a neutron star — some spin as pulsars that sweep beams across space.",
  },
  A: {
    name: "White star",
    fact: "A stars like Sirius A and Vega are about 1.4–2 Suns and burn white for around a billion years.",
    remnant: "They puff off their outer layers as a glowing shell, then settle as a white dwarf (Sirius B is one).",
  },
  F: {
    name: "Yellow-white star",
    fact: "F stars like Procyon A are a little heavier and hotter than the Sun, living a few billion years.",
    remnant: "They end as white dwarfs — Earth-sized embers that are about a million times denser than water.",
  },
  G: {
    name: "Sun-like star",
    fact: "G stars like our Sun fuse hydrogen steadily for about 10 billion years.",
    remnant: "In roughly 5 billion years the Sun swells into a red giant, then fades into a white dwarf.",
  },
  K: {
    name: "Orange dwarf",
    fact: "K dwarfs like Epsilon Eridani are cooler than the Sun and live tens of billions of years.",
    remnant: "They outlast the universe's age so far, so no K dwarf has become a white dwarf yet.",
  },
  M: {
    name: "Red dwarf",
    fact: "M dwarfs like Proxima Centauri are the most common stars — about three in four — and can burn for trillions of years.",
    remnant: "Too light and slow-burning to have left any remnant yet; they are the safe, low-glow end of the scale.",
  },
};

export const STAR_FORM_INTRO = [
  "Stars are born inside cold clouds of gas and dust. Gravity pulls a clump inward, compression heats the core, and when it is hot and dense enough, hydrogen fusion switches on.",
  "How much mass the cloud gathers decides everything: its colour, its lifetime, and what it leaves behind when it dies.",
] as const;

export const STAR_FORM_NOTE =
  "In the game, “mass” is a stylised number for the cloud, not real solar masses, and boosts and speeds are made up so a run feels exciting — but the order of the stars and the remnants they leave follow real astronomy.";

export const DISTANCE_TEACH = {
  intro:
    "Astronomers measure huge distances by the time light takes to cross them. Light is the fastest thing there is, and the distances in this game roll up through the same units. The speeds are a game scale, not real physics — nothing real travels this fast.",
  units: [
    { unit: "Light-second", fact: "about 300,000 km — roughly the distance from Earth to the Moon is 1.3 of them." },
    { unit: "Light-minute", fact: "sunlight takes about 8.3 light-minutes to reach Earth." },
    { unit: "Light-hour", fact: "Neptune, the farthest planet, is roughly 4 light-hours from the Sun." },
    { unit: "Light-day", fact: "the Voyager 1 probe, launched in 1977, is only now approaching one light-day from Earth." },
    { unit: "Light-year", fact: "about 9.5 trillion km. The nearest star beyond the Sun, Proxima Centauri, is 4.2 light-years away, and the Milky Way is around 100,000 light-years across." },
  ],
} as const;

/** What the red-ringed hazards are, in real astronomy terms. */
export const OBSTACLE_TEACH = [
  {
    name: "Stars with planets",
    game: "Drifters",
    fact: "Most stars have planets. Here a star drifts by with 1–3 planets orbiting it — the star and every planet can hurt you.",
  },
  {
    name: "Rogue stars",
    game: "Chasers",
    fact: "Stars passing close to each other tug on one another through gravity. This one is pulled toward your cloud and homes in for a while before it drifts off.",
  },
  {
    name: "Runaway stars and rogue planets",
    game: "Darts",
    fact: "Supernova blasts and close encounters can fling a star out of its home at over 100 km/s, and free-floating rogue planets drift between the stars with no sun at all. A red warning line shows where they will streak through.",
  },
] as const;

export const STAR_FORM_TRAVEL =
  "You are cruising through a spiral arm of the Milky Way, our galaxy of a few hundred billion stars. The pale band behind you is the combined glow of countless distant stars and dark dust lanes.";
