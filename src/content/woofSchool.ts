/** Woof School — open campus topics, micro-lessons, tiny woof checks. */

export type WoofChoice = { id: "a" | "b" | "c"; text: string };

export type WoofQuestion = {
  id: string;
  prompt: string;
  choices: WoofChoice[];
  answer: "a" | "b" | "c";
};

export type MicroLesson = {
  slug: string;
  title: string;
  body: string[];
  bullets?: string[];
  /** Paragraphs after the bullet list */
  after?: string[];
  image?: string;
  imageAlt?: string;
};

export type SchoolTopic = {
  slug: string;
  title: string;
  blurb: string;
  emoji: string;
  status: "ready" | "later";
  courtyardLabel?: string;
  lessons: MicroLesson[];
  woofCheck?: {
    passAt: number;
    questions: WoofQuestion[];
  };
};

export const SNIFFER_THRESHOLD = 10;

export const schoolTopics: SchoolTopic[] = [
  {
    slug: "looking-up",
    title: "Looking up",
    blurb: "Night sky basics, day vs night, why stars twinkle.",
    emoji: "🌙",
    status: "ready",
    courtyardLabel: "courtyard",
    lessons: [
      {
        slug: "day-night-sky-drifts",
        title: "Day, night, and a sky that drifts",
        image: "/woof-school/day-night-spin.jpeg",
        imageAlt: "Earth spinning under the Sun — day on one side, night on the other, Hosky on the grass",
        body: [
          "Earth is a ball. The Sun lights one half.",
          "As Earth spins, your ground rolls into the light (day) and into the shadow (night). One spin takes about 24 hours.",
          "That same spin makes the sky look like it moves. Sit still for an hour and bright stars slide west. They are not racing. You are.",
        ],
      },
      {
        slug: "night-sky-twinkle",
        title: "What the night sky actually is",
        image: "/woof-school/twinkle.jpeg",
        imageAlt: "Starlight bending through wiggly air pockets — twinkle",
        body: [
          "Stars are there in the afternoon. Daytime blue is just too bright.",
          "At night you can see:",
        ],
        bullets: [
          "Stars — other suns, very far, squeezed into pinpricks",
          "The Moon — Earth’s companion. No light of its own. It reflects the Sun.",
          "Planets — extra-bright “stars” that change seats over weeks",
        ],
        after: [
          "City glow hides faint stars. Face away from the brightest streetlights.",
          "Twinkle: starlight is a thin beam. Earth’s air has warm and cold pockets. Those pockets bend the beam, so a star seems to blink. Planets usually look steadier — they look like tiny disks, not single points.",
        ],
      },
    ],
    woofCheck: {
      passAt: 2,
      questions: [
        {
          id: "lu-1",
          prompt: "Why do we have night?",
          choices: [
            { id: "a", text: "The Sun turns off" },
            { id: "b", text: "Earth spins us into its own shadow" },
            { id: "c", text: "Stars steal the sunlight" },
          ],
          answer: "b",
        },
        {
          id: "lu-2",
          prompt: "Are the stars gone during the day?",
          choices: [
            { id: "a", text: "Yes, they go to sleep" },
            { id: "b", text: "No — the blue sky just outshines them" },
            { id: "c", text: "They hide behind the Moon" },
          ],
          answer: "b",
        },
        {
          id: "lu-3",
          prompt: "Why do stars twinkle?",
          choices: [
            { id: "a", text: "They’re tiny campfires flickering" },
            { id: "b", text: "Earth’s wiggly air bends their skinny light" },
            { id: "c", text: "Dogs on other planets are barking at them" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "our-backyard",
    title: "Our backyard",
    blurb: "Earth, Moon, seasons, eclipses — the neighborhood you stand in.",
    emoji: "🌍",
    status: "ready",
    courtyardLabel: "courtyard",
    lessons: [
      {
        slug: "earth-and-moon",
        title: "Earth and Moon",
        image: "/woof-school/moon-reflects.jpeg",
        imageAlt: "Earth and Moon — the Moon reflecting sunlight",
        body: [
          "Earth is the ground under you: rock, water, air, and a spin.",
          "The Moon is a smaller ball looping around Earth. It looks large because it is close.",
          "We see different amounts of its sunlit face over a month. That is why it changes shape.",
        ],
      },
      {
        slug: "seasons-tilt",
        title: "Seasons (tilt, not “closer to the Sun”)",
        image: "/woof-school/seasons-tilt.jpeg",
        imageAlt: "Earth tipped on its axis — seasons from tilt, not distance",
        body: [
          "Earth’s spin axis is tipped.",
          "When your hemisphere tips toward the Sun: longer days, higher Sun, summer.",
          "When it tips away: shorter days, lower Sun, winter.",
          "The other hemisphere gets the opposite season at the same time. Distance to the Sun is not the main reason. Tilt is.",
        ],
      },
      {
        slug: "eclipses",
        title: "Eclipses (shadows lining up)",
        image: "/woof-school/eclipses.jpeg",
        imageAlt: "Lunar eclipse safe to watch; solar eclipse never look at the Sun",
        body: [
          "Sometimes the three balls line up.",
        ],
        bullets: [
          "Lunar eclipse: Earth sits between Sun and Moon. Earth’s shadow slides across the Moon. Safe to watch with your eyes.",
          "Solar eclipse: the Moon sits between Sun and Earth and covers the Sun. Never look at the Sun to check. Only proper eclipse glasses or a projected image.",
        ],
        after: [
          "Most months they miss each other. An eclipse is a rare clean lineup.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "ob-1",
          prompt: "Why does the Moon shine in our sky?",
          choices: [
            { id: "a", text: "It makes its own fire" },
            { id: "b", text: "It reflects sunlight" },
          ],
          answer: "b",
        },
        {
          id: "ob-2",
          prompt: "Why do stars twinkle?",
          choices: [
            { id: "a", text: "They are tiny fires" },
            { id: "b", text: "Wiggly air bends their thin light" },
          ],
          answer: "b",
        },
        {
          id: "ob-3",
          prompt: "What mostly makes seasons?",
          choices: [
            { id: "a", text: "Earth getting much closer to the Sun" },
            { id: "b", text: "Earth’s axis being tipped" },
          ],
          answer: "b",
        },
        {
          id: "ob-4",
          prompt: "Which eclipse is safe to watch with unaided eyes?",
          choices: [
            { id: "a", text: "Solar" },
            { id: "b", text: "Lunar" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "solar-system",
    title: "Solar System",
    blurb: "Sun, planets, leftovers, and orbits that are falling forever.",
    emoji: "🪐",
    status: "ready",
    courtyardLabel: "neighborhood",
    lessons: [
      {
        slug: "sun-boss",
        title: "The Sun (the boss, not a planet)",
        image: "/woof-school/sun-a-star.jpeg",
        imageAlt: "The Sun as a star holding the neighborhood with gravity",
        body: [
          "The Sun is a star. It sits in the middle and holds the neighborhood with gravity.",
          "It is hugely bigger than anything else here. Planets only look important because they are closer to us.",
          "Do not look straight at it.",
        ],
      },
      {
        slug: "eight-planets",
        title: "Eight planets",
        image: "/woof-school/solar-system-not-to-scale.jpeg",
        imageAlt: "Solar System poster — not to scale",
        body: [
          "Going out from the Sun:",
        ],
        bullets: [
          "Rocky and small: Mercury, Venus, Earth, Mars",
          "Giant and far: Jupiter, Saturn, Uranus, Neptune",
        ],
        after: [
          "All eight loop the Sun the same way. Pluto is a dwarf planet now — still real, just in a bigger leftover crowd.",
          "The usual poster is a liar about size and space. The Sun should be a watermelon and Earth a pinhead a hallway away. We squash the picture so it fits on one page.",
        ],
      },
      {
        slug: "leftovers",
        title: "Leftovers: asteroids and comets",
        image: "/woof-school/asteroids-comets.jpeg",
        imageAlt: "Asteroid belt potatoes and a comet with a tail pointing away from the Sun",
        body: [
          "Not everything became a planet.",
          "Asteroids are rocky leftovers. A big crowd sits between Mars and Jupiter (the asteroid belt). Most are more “potato” than “ball.”",
          "Comets are icy leftovers. Far out they are dirty snowballs. Near the Sun, ice turns to gas and dust and a tail grows. The tail is pushed away from the Sun, so a comet does not always “follow” its tail.",
        ],
      },
      {
        slug: "orbits-falling",
        title: "Orbits = falling forever",
        image: "/woof-school/orbit-falling-forever.jpeg",
        imageAlt: "Falling and missing equals an orbit",
        body: [
          "A planet is falling toward the Sun.",
          "It is also moving sideways fast enough that it keeps missing. Fall + miss + fall + miss = an orbit.",
          "Closer worlds move faster and finish a lap sooner. Mercury’s year is short. Neptune’s year is longer than a human life.",
          "Paths are slight ovals (ellipses), not perfect cartoon circles. For this courtyard, “loop” is close enough.",
          "Tides, one line: the Moon tugs Earth’s water into two bulges. Those bulges are tides. Same kind of pull, much smaller stage.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "ss-1",
          prompt: "The Sun is",
          choices: [
            { id: "a", text: "the biggest planet" },
            { id: "b", text: "a star" },
          ],
          answer: "b",
        },
        {
          id: "ss-2",
          prompt: "Which group is rocky and close in?",
          choices: [
            { id: "a", text: "Jupiter, Saturn, Uranus, Neptune" },
            { id: "b", text: "Mercury, Venus, Earth, Mars" },
          ],
          answer: "b",
        },
        {
          id: "ss-3",
          prompt: "A comet’s tail points",
          choices: [
            { id: "a", text: "always behind it, like a jet" },
            { id: "b", text: "away from the Sun" },
          ],
          answer: "b",
        },
        {
          id: "ss-4",
          prompt: "A planet stays in orbit because it is",
          choices: [
            { id: "a", text: "floating with the gravity switched off" },
            { id: "b", text: "falling toward the Sun and missing" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "star-lives",
    title: "Star lives",
    blurb: "Birth, main sequence, giants, leftovers.",
    emoji: "⭐",
    status: "later",
    lessons: [],
  },
  {
    slug: "light-tricks",
    title: "Light tricks",
    blurb: "Waves, color, spectra, redshift — chill version.",
    emoji: "🌈",
    status: "later",
    lessons: [],
  },
  {
    slug: "gravity-orbits",
    title: "Gravity & orbits",
    blurb: "Falling forever, tides, Kepler without trauma.",
    emoji: "🌀",
    status: "later",
    lessons: [],
  },
  {
    slug: "deep-sky",
    title: "Deep sky",
    blurb: "Nebulae, clusters, Milky Way, other galaxies.",
    emoji: "🌌",
    status: "later",
    lessons: [],
  },
  {
    slug: "cosmos-timeline",
    title: "Cosmos timeline",
    blurb: "Big Bang sketch, expansion, how old is old.",
    emoji: "⏳",
    status: "later",
    lessons: [],
  },
  {
    slug: "tools-of-the-trade",
    title: "Tools of the trade",
    blurb: "Eyes, binoculars, telescopes, space telescopes.",
    emoji: "🔭",
    status: "later",
    lessons: [],
  },
  {
    slug: "missions-humans",
    title: "Missions & humans",
    blurb: "Satellites, rovers, ISS, why we go.",
    emoji: "🚀",
    status: "later",
    lessons: [],
  },
  {
    slug: "sky-stories",
    title: "Sky stories",
    blurb: "Constellations, culture, naming — respectful, not one culture only.",
    emoji: "📖",
    status: "later",
    lessons: [],
  },
  {
    slug: "tonight-practice",
    title: "Tonight practice",
    blurb: "Seasonal sky, Moon phases, what’s up from your country.",
    emoji: "🦴",
    status: "later",
    lessons: [],
  },
];

/** Optional Hosky-suggested stroll (never a gate). */
export const suggestedOrder = [
  "looking-up",
  "our-backyard",
  "solar-system",
  "star-lives",
  "light-tricks",
  "gravity-orbits",
  "deep-sky",
  "tools-of-the-trade",
  "tonight-practice",
  "cosmos-timeline",
  "missions-humans",
  "sky-stories",
] as const;

export function getTopic(slug: string): SchoolTopic | undefined {
  return schoolTopics.find((t) => t.slug === slug);
}

export function readyTopics(): SchoolTopic[] {
  return schoolTopics.filter((t) => t.status === "ready");
}
