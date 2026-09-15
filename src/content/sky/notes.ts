export type Note = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  body: string[];
};

export const notes: Note[] = [
  {
    slug: "twilight-treat-window",
    title: "The twilight treat window",
    date: "2026-09-14",
    excerpt:
      "Blue hour is short, soft, and slightly snack-shaped. Astronomy with a kitchen timer.",
    tags: ["sky", "habit"],
    body: [
      "Blue hour is the garden’s polite version of urgency. The sky is still readable, the air cools, and the biscuits of daylight have not quite run out.",
      "I treat it like a treat window: not a deadline, just a good moment to look up before the porch light wins the argument. You do not need gear. You need curiosity and a willingness to stand still for three breaths.",
      "If the weather sulks, try again tomorrow. Orbits keep their appointments even when we miss ours.",
    ],
  },
  {
    slug: "fetch-distance-of-starlight",
    title: "The fetch distance of starlight",
    date: "2026-09-10",
    excerpt:
      "Light leaves a star, crosses empty lawns the size of forever, and still lands in your eye like a soft toss.",
    tags: ["sky", "light"],
    body: [
      "When I toss a ball, the arc is short and the return is negotiable. Starlight is a longer fetch: years, decades, sometimes centuries of travel before it arrives as a quiet pinpoint.",
      "That delay is not a bug. It is the point. Looking up is reading old mail that still feels present. The star may have shifted its habits; the photon in your eye is the moment it sent.",
      "I find that comforting. The universe keeps its receipts, and some of them glow.",
    ],
  },
  {
    slug: "orbit-of-a-curious-nose",
    title: "The orbit of a curious nose",
    date: "2026-09-05",
    excerpt:
      "Curiosity loops. You leave a question, circle back with better crumbs, and the path gets clearer.",
    tags: ["curiosity", "garden"],
    body: [
      "A good question behaves like an orbit: you do not smash into the answer on the first pass. You swing by, collect a fact, leave a bookmark, and return when the angle is kinder.",
      "That is how this garden works. Short notes. Soft check-ins. No gatekeeping of wonder. If a metaphor about snacks helps you hold a quantum idea, keep the metaphor — then upgrade it when you are ready.",
      "Precision can wait for the second sniff. Curiosity gets the first walk.",
    ],
  },
  {
    slug: "why-stars-look-still",
    title: "Why the stars look still",
    date: "2026-09-02",
    excerpt:
      "They are not still. Distance and patience conspire to make motion look like calm.",
    tags: ["sky", "perspective"],
    body: [
      "On a clear night the sky looks painted. That stillness is an illusion of scale. Stars race, galaxies drift, light itself is in a hurry — yet from a backyard, the vault of heaven seems politely fixed.",
      "I find that useful as a teaching image. Some truths only reveal their motion when you wait long enough, or change your reference frame. A husky pacing the fence line looks restless up close and almost serene from across the yard.",
      "Tonight, if the weather cooperates, look up. Notice what appears motionless. Wonder what is moving — and leave a little room for both.",
    ],
  },
  {
    slug: "superposition-of-snacks",
    title: "The superposition of snacks",
    date: "2026-08-28",
    excerpt:
      "Until you open the cupboard, the biscuit both exists and does not. A gentle introduction to observation.",
    tags: ["quantum", "metaphor"],
    body: [
      "Open a cupboard and you collapse a wave function — or at least, that is how it feels when you are hoping for biscuits.",
      "Superposition is not magic; it is a precise statement about systems that have not yet been measured. The snack cupboard is a metaphor with teeth: before you look, you can only assign probabilities. After you look, you have a fact — and crumbs.",
      "I like this framing because it keeps the mystery without abandoning the math. Curiosity first, equations when they earn their keep. The garden prefers that order.",
    ],
  },
];

export function getNote(slug: string): Note | undefined {
  return notes.find((n) => n.slug === slug);
}
