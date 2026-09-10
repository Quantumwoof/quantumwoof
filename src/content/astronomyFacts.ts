/**
 * Curated astronomy fact bank for the garden.
 * Indexed by a deterministic 12-hour global slot so every visitor
 * sees the same fact for the same window — no API or cron.
 * Display copy uses WAT / local countdown; slot math stays shared.
 */
export const astronomyFacts = [
  "One light-year is about 9.5 trillion kilometers — a long fetch, even for a determined husky.",
  "The Moon is slowly drifting away from Earth by roughly 3.8 centimeters each year. Quiet progress.",
  "Venus spins backwards compared with most planets. Its day is longer than its year.",
  "A teaspoon of neutron-star material would weigh billions of tons on Earth. Dense, and not snackable.",
  "Polaris sits nearly above Earth's north axis, so it barely wanders while the sky turns.",
  "Saturn would float in a bathtub big enough for it — its average density is less than water.",
  "There are more stars in the observable universe than grains of sand on all Earth's beaches. Roughly.",
  "Auroras happen when the solar wind tickles Earth's magnetic field and lights the upper air.",
  "Olympus Mons on Mars is about three times taller than Everest — a mountain that needs a passport.",
  "The Sun is about 4.6 billion years old and roughly halfway through its main-sequence life.",
  "Jupiter's Great Red Spot is a storm wider than Earth, and it has been raging for centuries.",
  "Light from the Sun takes about eight minutes to reach us. What you see is slightly in the past.",
  "A black hole's event horizon is not a surface you can stand on — it is a one-way boundary in spacetime.",
  "Betelgeuse is a red supergiant so large that, if it replaced the Sun, it would swallow Jupiter's orbit.",
  "Earth's magnetic field shields us from much of the solar wind. A quiet kindness from the core.",
  "The Milky Way and Andromeda are approaching and will eventually merge — on a timetable of billions of years.",
  "Comets are icy leftovers from the early Solar System; their tails always point away from the Sun.",
  "There is no sound in space because sound needs a medium. The cosmos is a visual conversation.",
  "Pluto's largest moon, Charon, is so big that the two orbit a point outside Pluto itself.",
  "A day on Mercury lasts about 59 Earth days; a year lasts only 88. Odd calendar, that one.",
  "The cosmic microwave background is leftover glow from when the universe was about 380,000 years old.",
  "Io, a moon of Jupiter, is the most volcanically active world in the Solar System.",
  "Dark matter does not emit or absorb light; we infer it from how galaxies hold together and move.",
  "The International Space Station orbits Earth roughly every 90 minutes — sixteen sunrises a day for its crew.",
  "Enceladus sprays water ice from its south pole; some of that mist feeds Saturn's E ring.",
  "Our Solar System orbits the galactic center once every 230 million years or so — one galactic year.",
  "Meteor showers happen when Earth crosses a comet's dusty trail. Tiny leftovers, bright endings.",
  "White dwarfs are Earth-sized remnants of stars like the Sun — dense leftovers after the fusion party ends.",
] as const;

export type AstronomyFact = (typeof astronomyFacts)[number];

/** Milliseconds in a 12-hour UTC window. */
export const FACT_SLOT_MS = 12 * 60 * 60 * 1000;

/** Floor-divide Unix time into 12-hour slots (shared by all visitors). */
export function getUtcFactSlot(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / FACT_SLOT_MS);
}

export function getFactForSlot(slot: number): AstronomyFact {
  const i = ((slot % astronomyFacts.length) + astronomyFacts.length) % astronomyFacts.length;
  return astronomyFacts[i];
}

/** End of the current 12-hour UTC window (exclusive upper bound as ms). */
export function getSlotEndMs(nowMs: number = Date.now()): number {
  return (getUtcFactSlot(nowMs) + 1) * FACT_SLOT_MS;
}

export function formatCountdown(msRemaining: number): string {
  const clamped = Math.max(0, msRemaining);
  const totalMin = Math.floor(clamped / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `New fact in ${m}m`;
  return `New fact in ${h}h ${m}m`;
}
