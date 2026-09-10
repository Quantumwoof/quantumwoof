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
    slug: "superposition-of-snacks",
    title: "The superposition of snacks",
    date: "2026-08-28",
    excerpt:
      "Until you open the cupboard, the biscuit both exists and does not. A gentle introduction to observation.",
    tags: ["quantum", "metaphor"],
    body: [
      "Open a cupboard and you collapse a wave function — or at least, that is how it feels when you are hoping for biscuits.",
      "Superposition is not magic; it is a precise statement about systems that have not yet been measured. The snack cupboard is a metaphor with teeth: before you look, you can only assign probabilities. After you look, you have a fact — and crumbs.",
      "I like this framing because it keeps the mystery without abandoning the math. Curiosity first, equations when they earn their keep.",
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
      "I find that useful as a teaching image. Some truths only reveal their motion when you wait long enough, or change your reference frame.",
      "Tonight, if the weather cooperates, look up. Notice what appears motionless. Wonder what is moving.",
    ],
  },
];

export function getNote(slug: string): Note | undefined {
  return notes.find((n) => n.slug === slug);
}
