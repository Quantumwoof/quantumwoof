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

/** 9 of 11 after Tools + Tonight merged into Go outside (was 10 of 12). */
export const SNIFFER_THRESHOLD = 9;

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
            { id: "c", text: "It is a giant flashlight battery" },
          ],
          answer: "b",
        },
        {
          id: "ob-2",
          prompt: "Why do stars twinkle?",
          choices: [
            { id: "a", text: "They are tiny fires" },
            { id: "b", text: "Wiggly air bends their thin light" },
            { id: "c", text: "Hosky is blinking Morse code at them" },
          ],
          answer: "b",
        },
        {
          id: "ob-3",
          prompt: "What mostly makes seasons?",
          choices: [
            { id: "a", text: "Earth getting much closer to the Sun" },
            { id: "b", text: "Earth’s axis being tipped" },
            { id: "c", text: "Earth putting on a winter coat" },
          ],
          answer: "b",
        },
        {
          id: "ob-4",
          prompt: "Which eclipse is safe to watch with unaided eyes?",
          choices: [
            { id: "a", text: "Solar" },
            { id: "b", text: "Lunar" },
            { id: "c", text: "Both, if you squint really hard" },
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
            { id: "c", text: "a really bright city" },
          ],
          answer: "b",
        },
        {
          id: "ss-2",
          prompt: "Which group is rocky and close in?",
          choices: [
            { id: "a", text: "Jupiter, Saturn, Uranus, Neptune" },
            { id: "b", text: "Mercury, Venus, Earth, Mars" },
            { id: "c", text: "Pluto, Ceres, Eris, and Hosky" },
          ],
          answer: "b",
        },
        {
          id: "ss-3",
          prompt: "A comet’s tail points",
          choices: [
            { id: "a", text: "always behind it, like a jet" },
            { id: "b", text: "away from the Sun" },
            { id: "c", text: "toward the nearest dog treats" },
          ],
          answer: "b",
        },
        {
          id: "ss-4",
          prompt: "A planet stays in orbit because it is",
          choices: [
            { id: "a", text: "floating with the gravity switched off" },
            { id: "b", text: "falling toward the Sun and missing" },
            { id: "c", text: "stuck on invisible rails" },
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
    status: "ready",
    courtyardLabel: "courtyard",
    lessons: [
      {
        slug: "star-birth",
        title: "Birth",
        image: "/woof-school/star-birth.jpeg",
        imageAlt: "Nebula nursery — gravity squeezes a clump until a star switches on",
        body: [
          "A star is a gas ball that squeezes itself until its core gets hot enough to fuse. How fat it is at birth decides almost the whole story.",
          "Stars start in a cold cloud of gas and dust (a nebula).",
          "A clump gets dense. Gravity pulls inward. The center heats up. When it is hot enough, hydrogen begins to fuse into helium — a star switches on.",
          "One cloud can make many stars. The leftover glow around new stars is often the nursery you still see.",
        ],
      },
      {
        slug: "main-sequence",
        title: "Main sequence (the long job)",
        image: "/woof-school/main-sequence.jpeg",
        imageAlt: "Fusion out vs gravity in — STEADY balance, Sun in the middle",
        body: [
          "This is the adult job: fuse hydrogen in the core.",
          "Gravity pulls in. Fusion pushes out. While those two match, the star is steady.",
          "Our Sun is here. It has been at it for about 5 billion years and has about 5 billion to go. Most stars spend most of their life on this step.",
          "Hot big stars burn fast and look bluish. Smaller cooler stars burn slow and look reddish. The Sun sits in the middle: yellow-white.",
        ],
      },
      {
        slug: "star-giants",
        title: "Giants",
        image: "/woof-school/star-giants.jpeg",
        imageAlt: "Adult star swelling into a red giant",
        body: [
          "Hydrogen in the core runs low. The balance slips. The core shrinks and heats. The outer layers puff out.",
          "The star becomes a giant (or, if it was already huge, a supergiant). It looks bigger and usually redder. It can swallow nearby worlds.",
          "The Sun will do this one day. Earth will not be a good porch.",
        ],
      },
      {
        slug: "star-leftovers",
        title: "Leftovers (mass picks the ending)",
        image: "/woof-school/star-leftovers.jpeg",
        imageAlt: "White dwarf, neutron star, or black hole depending on mass",
        body: [
          "After the giant phase, the star cannot keep the same shape. What remains depends on how heavy it was.",
        ],
        bullets: [
          "Sun-like (not too heavy): outer layers drift off as a glowing shell. The hot core left behind is a white dwarf — Earth-sized, star-mass, cooling for a very long time.",
          "Heavy: the star can explode as a supernova. The core left behind is a neutron star — a city-sized ball squeezed insanely tight.",
          "Even heavier: same kind of explosion, but the core collapses so far that a black hole is left. Gravity there is so strong that light cannot climb out. It is an ending, not a vacuum cleaner for the whole galaxy.",
        ],
        after: [
          "Most stars in the sky will take the white-dwarf road. The loud endings are rarer.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "sl-1",
          prompt: "A star turns on when",
          choices: [
            { id: "a", text: "it gets painted yellow" },
            { id: "b", text: "its core gets hot enough to fuse hydrogen" },
            { id: "c", text: "Hosky barks loud enough to light it" },
          ],
          answer: "b",
        },
        {
          id: "sl-2",
          prompt: "“Main sequence” means",
          choices: [
            { id: "a", text: "the star is exploding" },
            { id: "b", text: "the star is steadily fusing hydrogen" },
            { id: "c", text: "the star is on vacation" },
          ],
          answer: "b",
        },
        {
          id: "sl-3",
          prompt: "Stars swell into giants when",
          choices: [
            { id: "a", text: "they get lonely" },
            { id: "b", text: "the fuel in the core changes and the outer layers puff out" },
            { id: "c", text: "they drink too much cosmic juice" },
          ],
          answer: "b",
        },
        {
          id: "sl-4",
          prompt: "A black hole leftover comes from",
          choices: [
            { id: "a", text: "every star, including the Sun" },
            { id: "b", text: "only some of the heaviest stars" },
            { id: "c", text: "only stars named after dogs" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "light-tricks",
    title: "Light tricks",
    blurb: "Waves, color, spectra, redshift — chill version.",
    emoji: "🌈",
    status: "ready",
    courtyardLabel: "courtyard",
    lessons: [
      {
        slug: "light-waves",
        title: "Light is a wave",
        image: "/woof-school/light-waves.jpeg",
        imageAlt: "Visible spectrum — short blue to long red, UV and IR beyond",
        body: [
          "Light is how the sky writes to us. We do not fly to a star. We read the light that already arrived.",
          "Light travels as a wave. The length of that wave is the trick.",
          "Short waves look blue / violet.",
          "Long waves look red.",
          "There are waves we cannot see too — ultraviolet on the short side, infrared on the long side. Same family. Different stretch.",
        ],
      },
      {
        slug: "light-color",
        title: "Color",
        image: "/woof-school/light-color.jpeg",
        imageAlt: "Hot blue stars and cool red stars — color from temperature",
        body: [
          "A star’s color is mostly its temperature.",
          "Hotter surface → shorter waves → bluer.",
          "Cooler surface → longer waves → redder.",
          "White sunlight is a mix of many colors at once. A prism, water drops, or a rainbow un-mixes them into a stripe.",
          "This is not the same trick as redshift. A red giant looks red because it is cool on the outside. A far galaxy can look redder because its light got stretched on the way.",
        ],
      },
      {
        slug: "star-fingerprint",
        title: "Spectra (star fingerprints)",
        image: "/woof-school/star-fingerprint.jpeg",
        imageAlt: "Rainbow of starlight with dark element fingerprint lines",
        body: [
          "Spread a star’s light into a rainbow and it is not a smooth smear. It has thin dark or bright lines.",
          "Those lines belong to elements — hydrogen, helium, sodium, and the rest. Each element nicks the rainbow in its own pattern.",
          "That is how we know what a star is made of without scooping it. The spectrum is the ID card.",
        ],
      },
      {
        slug: "redshift",
        title: "Redshift (chill version)",
        image: "/woof-school/redshift.jpeg",
        imageAlt: "Light waves stretched longer toward red as space expands",
        body: [
          "If a light source is racing away, or if space itself stretches while the light is traveling, the waves get longer.",
          "Longer waves slide toward red. That shift is redshift.",
          "Nearby, it can mean “this thing is moving away.”",
          "On galaxy scales, almost everything is redshifted. Space between galaxies is stretching. That is the first breadcrumb for Cosmos timeline.",
          "Blueshift is the opposite: waves squashed shorter, toward blue, when something comes closer. We see that too. It is just less common for far galaxies.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "lt-1",
          prompt: "Blue light has",
          choices: [
            { id: "a", text: "longer waves than red" },
            { id: "b", text: "shorter waves than red" },
            { id: "c", text: "the same waves, just louder" },
          ],
          answer: "b",
        },
        {
          id: "lt-2",
          prompt: "A star looks blue mostly because",
          choices: [
            { id: "a", text: "it is painted" },
            { id: "b", text: "its surface is hotter" },
            { id: "c", text: "it is shy and blushing blue" },
          ],
          answer: "b",
        },
        {
          id: "lt-3",
          prompt: "Dark lines in a rainbow-of-starlight tell us",
          choices: [
            { id: "a", text: "the star’s favorite color" },
            { id: "b", text: "which elements are in it" },
            { id: "c", text: "where Hosky hid the treats" },
          ],
          answer: "b",
        },
        {
          id: "lt-4",
          prompt: "Redshift means the light waves were",
          choices: [
            { id: "a", text: "painted red by the star" },
            { id: "b", text: "stretched longer" },
            { id: "c", text: "tired from the long trip and napping" },
          ],
          answer: "b",
        },
      ],
    },
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
    status: "ready",
    courtyardLabel: "courtyard",
    lessons: [
      {
        slug: "nebulae",
        title: "Nebulae (clouds with jobs)",
        image: "/woof-school/nebulae.jpeg",
        imageAlt: "Nebulae jobs — nursery, leftover shell, blast cloud",
        body: [
          "So far the campus was the backyard and one star’s life. Deep sky is the bigger furniture: clouds, crowds, the street we live on, and other streets.",
          "A nebula is a cloud of gas and dust. Not one job:",
        ],
        bullets: [
          "Nurseries — cold clumps collapse and stars turn on (you met this in Star lives).",
          "Leftover shells — a dying Sun-like star puffs its outer layers into a glowing ring.",
          "Blast clouds — a heavy star explodes and leaves a torn, fast cloud.",
        ],
        after: [
          "The pretty colors in photos are often real gases glowing, sometimes boosted so our eyes can share the view.",
        ],
      },
      {
        slug: "clusters",
        title: "Clusters (stars that grew up together)",
        image: "/woof-school/clusters.jpeg",
        imageAlt: "Open cluster loose family vs globular tight old ball",
        body: [
          "Stars often form in groups.",
        ],
        bullets: [
          "Open clusters — loose family, dozens to thousands of stars, still in the galaxy’s disk. They drift apart over time.",
          "Globular clusters — tight old balls of hundreds of thousands of stars, haloed around the galaxy. They look like a spark-ball through binoculars.",
        ],
        after: [
          "A cluster is not a constellation. A constellation is a connect-the-dots drawing from Earth. A cluster is a real crowd in space.",
        ],
      },
      {
        slug: "milky-way",
        title: "The Milky Way (our street)",
        image: "/woof-school/milky-way.jpeg",
        imageAlt: "Milky Way disk face-on and pale river edge-on",
        body: [
          "We live in the Milky Way: a huge disk of stars, gas, and dust with a thicker middle and spiral arms.",
          "From a dark place the Milky Way looks like a pale river across the sky. That river is the disk seen edge-on — you are looking along the street, not down on a map.",
          "The Solar System is not in the center. We ride an arm, a long way out. The center is hidden behind dust. It holds a very heavy black hole. That hole is the downtown well, not a drain that is swallowing the whole street tomorrow.",
        ],
      },
      {
        slug: "other-galaxies",
        title: "Other galaxies",
        image: "/woof-school/galaxy-types.jpeg",
        imageAlt: "Spiral, elliptical, irregular galaxies and Andromeda smudge",
        body: [
          "A galaxy is a whole island of stars, gas, dust, and invisible extra mass holding it together.",
          "Some are spirals like us. Some are smooth ovals. Some are bent from past crashes. Almost all sit far outside the Milky Way.",
          "Andromeda is the nearest big spiral. It is already in our sky as a faint smudge if the night is dark. Many more only show up as tiny smudges in a telescope — each smudge still a city of stars.",
          "The leftover lesson from Light tricks: far galaxies look redshifted. Space between the islands is stretching. That thread continues in Cosmos timeline.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "ds-1",
          prompt: "Nebulae are",
          choices: [
            { id: "a", text: "only pretty wallpaper with one job" },
            { id: "b", text: "gas-and-dust clouds with jobs like nurseries, leftover shells, and blast clouds" },
            { id: "c", text: "giant frozen tennis balls" },
          ],
          answer: "b",
        },
        {
          id: "ds-2",
          prompt: "A star cluster is different from a constellation because",
          choices: [
            { id: "a", text: "constellations are denser crowds in space" },
            { id: "b", text: "a cluster is a real crowd; a constellation is a connect-the-dots drawing from Earth" },
            { id: "c", text: "clusters only exist on Tuesdays" },
          ],
          answer: "b",
        },
        {
          id: "ds-3",
          prompt: "In the Milky Way, our Solar System",
          choices: [
            { id: "a", text: "sits right in the downtown black-hole lobby" },
            { id: "b", text: "rides an arm far from the center’s heavy black-hole well" },
            { id: "c", text: "is glued to the pale river with cosmic tape" },
          ],
          answer: "b",
        },
        {
          id: "ds-4",
          prompt: "Andromeda is",
          choices: [
            { id: "a", text: "a bright streetlight inside our Solar System" },
            { id: "b", text: "the nearest big spiral galaxy — a faint smudge on a dark night" },
            { id: "c", text: "Hosky’s favorite chew toy constellation" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "cosmos-timeline",
    title: "Cosmos timeline",
    blurb: "Big Bang sketch, expansion, how old is old.",
    emoji: "⏳",
    status: "ready",
    courtyardLabel: "courtyard",
    lessons: [
      {
        slug: "big-bang",
        title: "Big Bang sketch",
        image: "/woof-school/big-bang.jpeg",
        imageAlt: "Hot packed start — space itself stretches, not a bomb in empty room",
        body: [
          "This courtyard is the clock, not a new object in the sky. Deep sky showed the islands. This one asks how long the water between the islands has been stretching.",
          "The Big Bang is not a bomb in an empty room.",
          "It is the start of the clock we can measure: the universe was once extremely hot and packed. Space itself has been stretching ever since. Galaxies are not flying through a fixed warehouse. The warehouse is getting bigger.",
          "“Where did it happen?” Everywhere that is now space. There is no empty seat outside the blast.",
          "We do not have a backyard picture of “before.” This lesson stops at the first moment we can talk about with evidence.",
        ],
      },
      {
        slug: "expansion-raisins",
        title: "Expansion",
        image: "/woof-school/expansion-raisins.jpeg",
        imageAlt: "Raisin dough rising — space stretches, raisins don’t run",
        body: [
          "Far galaxies show redshift. Their light waves got longer on the trip.",
          "A useful picture: raisin dough rising. The raisins do not run. The dough stretches, so every raisin sees the others slide away. More dough between two raisins → they separate faster.",
          "That is why nearer galaxies are less redshifted and far ones are more redshifted. Close neighbors can still drift toward each other (Andromeda is coming our way). The stretch shows up clearly across huge distances.",
        ],
      },
      {
        slug: "cmb",
        title: "The leftover glow",
        image: "/woof-school/cmb.jpeg",
        imageAlt: "Cosmic microwave background — leftover heat from every direction",
        body: [
          "The early universe was so hot it glowed.",
          "As space stretched, that glow cooled and stretched into microwave light. It still fills the sky in every direction: the cosmic microwave background.",
          "It is not starlight. It is leftover heat from when the universe was young, now faint and stretched. That even glow is one of the strongest reasons the hot-start story holds.",
        ],
      },
      {
        slug: "how-old",
        title: "How old is old",
        image: "/woof-school/how-old.jpeg",
        imageAlt: "Looking far is looking back — universe clock timeline",
        body: [
          "Rough clock, good enough for this campus:",
        ],
        bullets: [
          "Universe ≈ 13.8 billion years",
          "Milky Way already old, but not day-one",
          "Sun and Earth ≈ 4.6 / 4.5 billion years",
          "Human written history ≈ a few thousand years",
        ],
        after: [
          "A billion is a thousand millions. If the universe were a 14-year-old, the Sun would be about 5, and written history would be the last blink.",
          "Light takes time. Looking far away is also looking back in time. A galaxy 100 million light-years off is a 100-million-year-old postcard.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "ct-1",
          prompt: "The Big Bang is best pictured as",
          choices: [
            { id: "a", text: "a bomb in an already-empty room" },
            { id: "b", text: "space starting hot and packed, then stretching" },
            { id: "c", text: "Hosky sneezing the galaxies into place" },
          ],
          answer: "b",
        },
        {
          id: "ct-2",
          prompt: "Far galaxies look redshifted mainly because",
          choices: [
            { id: "a", text: "they are all on fire" },
            { id: "b", text: "the space between us stretched the light" },
            { id: "c", text: "they are embarrassed and blushing" },
          ],
          answer: "b",
        },
        {
          id: "ct-3",
          prompt: "The microwave glow from every direction is",
          choices: [
            { id: "a", text: "the Milky Way’s streetlights" },
            { id: "b", text: "leftover heat from the young universe" },
            { id: "c", text: "someone reheating leftovers in space" },
          ],
          answer: "b",
        },
        {
          id: "ct-4",
          prompt: "The universe is about",
          choices: [
            { id: "a", text: "a few thousand years old" },
            { id: "b", text: "13.8 billion years old" },
            { id: "c", text: "as old as Hosky’s favorite stick" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "go-outside",
    title: "Go outside",
    blurb: "Eyes, light buckets, Moon phases, and tonight’s sky from Nigeria.",
    emoji: "🦴",
    status: "ready",
    courtyardLabel: "porch",
    lessons: [
      {
        slug: "eyes-first",
        title: "Eyes first",
        image: "/woof-school/eyes-first.jpeg",
        imageAlt: "Dark-adapted eyes — phone away, averted vision, never stare at the Sun",
        body: [
          "This courtyard is the porch. The last ones were ideas. These are the things you actually take into the dark.",
          "Your first instrument is already on your face.",
          "Give it 10–15 minutes in the dark. Bright phone light resets that clock. Face away from streetlights.",
          "Averted vision: look a little beside a faint fuzzy, not straight at it. The side of your eye is better at dim glow.",
          "Still never stare at the Sun. Not with eyes, not with binoculars, not with a telescope, unless the tool is built for it.",
        ],
      },
      {
        slug: "collect-light",
        title: "Tools that collect light",
        image: "/woof-school/collect-light.jpeg",
        imageAlt: "Eyes to binoculars to telescope to space telescope — collecting light",
        body: [
          "Zoom is not the main trick. Collecting light is.",
        ],
        bullets: [
          "Binoculars — two small tubes, wide view, easy on the Moon, star clusters, and the Milky Way river. Best first upgrade.",
          "Telescope — a bigger bucket (lens or mirror). More light → fainter things. High magnification only helps after the bucket is big enough and the air is steady.",
          "Space telescopes — same idea, parked above Earth’s wiggly air (the twinkle layer from Looking up). Hubble, JWST, and others see sharper and in colors our eyes miss.",
        ],
        after: [
          "A steady cheap binocular beats a shaky huge “600x” toy scope.",
        ],
      },
      {
        slug: "moon-phases",
        title: "Moon phases",
        image: "/woof-school/moon-phases.jpeg",
        imageAlt: "Moon phase cycle — viewing angle, not Earth’s weekly shadow",
        body: [
          "The Moon does not have a night-light switch. The Sun lights one half all the time.",
          "As the Moon loops Earth, we see different amounts of that lit half:",
          "New → crescent → quarter → gibbous → full → and back again.",
          "One full cycle ≈ 29.5 days.",
          "A crescent is not the Earth’s shadow. Earth’s shadow on the Moon is an eclipse (Our backyard). A phase is only viewing angle.",
          "Binoculars make craters pop along the line between light and dark (the terminator). That line is the best moonlight for looking.",
        ],
      },
      {
        slug: "seasonal-sky",
        title: "Tonight’s sky changes",
        image: "/woof-school/seasonal-sky.jpeg",
        imageAlt: "Seasonal sky from near the equator — Nigeria porch view",
        body: [
          "The night sky is not a fixed poster.",
          "Earth spins → stars slide west in one night.",
          "Earth orbits the Sun → midnight faces a new direction through the year, so winter evenings and summer evenings show different stars.",
          "From Nigeria and other places near the equator you get a wide slice of both north and south sky. The celestial equator passes high overhead. That is a gift: Orion, Southern Cross country, and the Milky Way river can all take turns.",
          "What to do tonight:",
        ],
        bullets: [
          "Stay somewhere you know.",
          "Face away from the brightest lights.",
          "Find the Moon if it is up. Name its phase.",
          "Then pick one bright pattern and watch it for 20 minutes.",
        ],
        after: [
          "A sky app helps. Your eyes still do the real work.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "go-1",
          prompt: "The most important first skill is",
          choices: [
            { id: "a", text: "buying the strongest zoom" },
            { id: "b", text: "letting your eyes get dark-adapted" },
            { id: "c", text: "yelling at the stars until they brighten" },
          ],
          answer: "b",
        },
        {
          id: "go-2",
          prompt: "A telescope’s real power is mostly",
          choices: [
            { id: "a", text: "a giant number printed on the box" },
            { id: "b", text: "how much light its bucket collects" },
            { id: "c", text: "how many stickers you put on it" },
          ],
          answer: "b",
        },
        {
          id: "go-3",
          prompt: "Moon phases happen because",
          choices: [
            { id: "a", text: "Earth covers the Moon each week" },
            { id: "b", text: "we see different amounts of the Moon’s sunlit half" },
            { id: "c", text: "the Moon is chewing different sized biscuits" },
          ],
          answer: "b",
        },
        {
          id: "go-4",
          prompt: "The constellations you get at 9pm change through the year because",
          choices: [
            { id: "a", text: "stars burn out every season" },
            { id: "b", text: "Earth has orbited and midnight faces a new direction" },
            { id: "c", text: "the sky printers run a new poster each month" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "missions-humans",
    title: "Missions & humans",
    blurb: "Satellites, rovers, ISS, why we go.",
    emoji: "🚀",
    status: "ready",
    courtyardLabel: "courtyard",
    lessons: [
      {
        slug: "earth-satellites",
        title: "Satellites (the ones that stay near Earth)",
        image: "/woof-school/earth-satellites.jpeg",
        imageAlt: "Earth satellites in continuous fall — weather, maps, phones",
        body: [
          "Go outside was how you look up. This courtyard is how humans send hardware — and sometimes people — off the porch.",
          "A satellite is anything in orbit. The Moon is a natural one. The rest we built.",
          "They stay up the same way planets do: falling toward Earth and missing. Low ones circle in about 90 minutes. That is why a bright satellite can cross your sky in minutes.",
          "Jobs from orbit:",
        ],
        bullets: [
          "weather and maps",
          "phones, TV, navigation",
          "looking at Earth, looking out at space",
        ],
        after: [
          "They are not hanging on invisible strings. They are in a continuous fall.",
        ],
      },
      {
        slug: "mars-rover",
        title: "Rovers (the ones that land)",
        image: "/woof-school/mars-rover.jpeg",
        imageAlt: "Mars rover rolling with suitcase lab tools",
        body: [
          "Some machines leave orbit and touch another world.",
          "Orbiters map from above. Landers sit still. Rovers roll and keep going — mostly on Mars so far, plus the Moon.",
          "They carry cameras, weather tools, and labs the size of a suitcase. They do not need a person on board. A rover can take months to arrive and then work for years.",
          "The trip is long because space is empty and planets only line up well now and then.",
        ],
      },
      {
        slug: "iss",
        title: "ISS (people in a falling house)",
        image: "/woof-school/iss.jpeg",
        imageAlt: "International Space Station — falling house, weightlessness",
        body: [
          "The International Space Station is a laboratory in low Earth orbit. Crews live there in shifts.",
          "It is still “falling and missing,” about 400 km up. That fall is what we call weightlessness inside. Gravity did not switch off. The station and the people are falling together.",
          "You can see it by eye: a steady bright moving dot, no blinking colors like a plane. It appears, crosses, and is gone in a few minutes.",
          "People go up to run experiments, learn how bodies handle space, and practice living off the ground.",
        ],
      },
      {
        slug: "why-we-go",
        title: "Why we go",
        image: "/woof-school/why-we-go.jpeg",
        imageAlt: "Why we go stack — know, watch, build, live, wonder",
        body: [
          "Not one reason. A stack:",
        ],
        bullets: [
          "Know — other worlds teach us how planets work, including Earth.",
          "Watch — satellites read weather, ice, crops, storms.",
          "Build — new tools (materials, medicine, computers) often spin out of mission problems.",
          "Live — if humans keep going farther, someone has to practice first.",
          "Wonder — a true reason, not a lesser one. Looking up is old. Going is the new verse.",
        ],
        after: [
          "Robots go first to harsh places. People go when the job needs hands, eyes, and judgment on the spot. Both count as the same school.",
        ],
      },
    ],
    woofCheck: {
      passAt: 3,
      questions: [
        {
          id: "mh-1",
          prompt: "A satellite stays in orbit because it is",
          choices: [
            { id: "a", text: "glued to the sky" },
            { id: "b", text: "falling toward Earth and missing" },
            { id: "c", text: "held up by invisible strings" },
          ],
          answer: "b",
        },
        {
          id: "mh-2",
          prompt: "A rover is different from an orbiter because it",
          choices: [
            { id: "a", text: "only takes photos of Earth" },
            { id: "b", text: "lands and can roll on another world" },
            { id: "c", text: "only works when Hosky waves" },
          ],
          answer: "b",
        },
        {
          id: "mh-3",
          prompt: "People float on the ISS because",
          choices: [
            { id: "a", text: "gravity is switched off up there" },
            { id: "b", text: "they and the station are falling together" },
            { id: "c", text: "the station is filled with helium balloons" },
          ],
          answer: "b",
        },
        {
          id: "mh-4",
          prompt: "“Why we go” is",
          choices: [
            { id: "a", text: "only for planting flags" },
            { id: "b", text: "a stack: know, watch, build, live, and wonder" },
            { id: "c", text: "just to fetch tennis balls from Mars" },
          ],
          answer: "b",
        },
      ],
    },
  },
  {
    slug: "sky-stories",
    title: "Sky stories",
    blurb: "Constellations, culture, naming — respectful, not one culture only.",
    emoji: "📖",
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
  "go-outside",
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
