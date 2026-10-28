/**
 * Curated astronomy fact bank for the garden.
 * Indexed by a deterministic 12-hour global slot so every visitor
 * sees the same fact for the same window — no API or cron.
 * Display copy uses UTC countdown; slot math stays shared.
 */
export const astronomyFacts = [
  "One light-year is about 9.5 trillion kilometers — a long fetch, even for a determined Hosky.",
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
  "The Southern Cross is the smallest of the 88 constellations, yet it guides southern-hemisphere stargazers toward the south celestial pole.",
  "Polaris's height above your horizon roughly equals your latitude north of the equator. South of the equator, it never rises.",
  "Close to the equator, you can see nearly every constellation of both hemispheres over the course of a year. Generous sky.",
  "In the tropics the Sun climbs steeply and sets fast, so twilight is short. Stars show up quickly after sunset.",
  "Anywhere between the Tropics of Cancer and Capricorn, the Sun passes directly overhead at noon on two days each year.",
  "Orion's Belt rises almost due east and sets almost due west, because it sits right on the celestial equator.",
  "Sirius is the brightest star in the night sky, and it is only about 8.6 light-years away. A close, sparkly neighbor.",
  "Alpha Centauri, the nearest star system to the Sun, lies far south in the sky — easy from the southern hemisphere, never seen from far-north latitudes.",
  "Canopus, the second-brightest star, sits deep in the southern sky, so stargazers north of about 37° latitude never see it rise.",
  "The Large and Small Magellanic Clouds are dwarf galaxies orbiting the Milky Way, best seen from the southern hemisphere.",
  "The bright core of the Milky Way lies toward Sagittarius and Scorpius, high in tropical skies on evenings around July and August.",
  "Antares, the red heart of Scorpius, is a supergiant hundreds of times wider than the Sun. Its name means 'rival of Mars'.",
  "The Pleiades, or Seven Sisters, is a young star cluster about 440 light-years away. Most eyes count six or seven stars.",
  "Venus is the brightest planet in our sky, often called the morning or evening star — though it is not a star at all.",
  "Mars looks red because its surface dust is rich in iron oxide. Basically, the whole planet is a bit rusty.",
  "Jupiter has the shortest day of any planet: it spins once in about 10 hours. Big, but in a hurry.",
  "With simple binoculars you can spot Jupiter's four largest moons, first seen by Galileo in 1610.",
  "Saturn's rings are mostly ice chunks, from dust-sized to house-sized, and are only tens of meters thick in places.",
  "Uranus rolls around the Sun on its side, tilted about 98 degrees. Each pole gets about 42 years of daylight.",
  "Neptune has the fastest winds measured in the Solar System, gusting past 2,000 kilometers per hour.",
  "Mercury is closest to the Sun, but Venus is the hottest planet, thanks to its thick carbon-dioxide blanket.",
  "The Moon always shows Earth the same face because it spins once for every orbit. Tidal locking, quietly at work.",
  "Total solar eclipses happen because the Sun is about 400 times wider than the Moon and also about 400 times farther away.",
  "A lunar eclipse turns the Moon coppery red because Earth's atmosphere bends sunset-colored light onto it.",
  "Twelve people walked on the Moon between 1969 and 1972. Their footprints may last millions of years in the still dust.",
  "The Sun holds about 99.8 percent of all the mass in the Solar System. Everything else is crumbs.",
  "Stars twinkle because Earth's moving air bends their light; planets usually shine steadier because they show tiny disks.",
  "A star's color hints at its temperature: blue stars are the hottest, red stars the coolest.",
  "The Andromeda Galaxy, about 2.5 million light-years away, is the most distant thing most people can see with the naked eye.",
  "A 'shooting star' is usually a speck of dust no bigger than a grain of sand, burning up high in the atmosphere.",
  "The Geminids each December are one of the richest meteor showers, with dozens of meteors an hour under dark skies.",
  "Earth is closest to the Sun in early January. Seasons come from Earth's 23.4-degree tilt, not its distance.",
  "A full Moon rises around sunset and sets around sunrise — it sits opposite the Sun in the sky.",
  "Earthshine is the faint glow on a crescent Moon's dark side: sunlight bounced off Earth, then off the Moon, back to us.",
  "The Voyager 1 probe, launched in 1977, is the most distant human-made object, now beyond the Sun's bubble of solar wind.",
  "The zodiacal light is a faint cone of sunlight scattered by dust, easiest to see from dark tropical skies after twilight.",
  "Neutron stars can spin hundreds of times a second; the beamed ones we detect are called pulsars. Cosmic lighthouses.",
  "The observable universe is about 93 billion light-years across, even though it is roughly 13.8 billion years old.",
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
