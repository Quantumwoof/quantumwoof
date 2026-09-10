/** Mini lessons for the Sky desk — shared with notes under one content folder. */

export type Lesson = {
  slug: string;
  title: string;
  summary: string;
  takeaway: string;
  tags: string[];
};

export const lessons: Lesson[] = [
  {
    slug: "wave-or-particle",
    title: "Wave or particle?",
    summary:
      "Light behaves like a wave in some experiments and like particles in others. The question is not which it 'is' — it is which question you are asking.",
    takeaway:
      "Pick the model that matches the measurement. That is not a dodge; it is good physics manners.",
    tags: ["quantum", "light"],
  },
  {
    slug: "entanglement-not-telepathy",
    title: "Entanglement is not telepathy",
    summary:
      "Correlated outcomes are real; instant messaging across the cosmos is not. Hosky keeps the wonder and the footnotes together.",
    takeaway:
      "Correlation ≠ communication. Still a beautiful mystery — just a disciplined one.",
    tags: ["quantum", "mythbust"],
  },
  {
    slug: "why-sky-is-dark",
    title: "Why is the night sky dark?",
    summary:
      "If the universe were infinite, eternal, and filled with stars, every line of sight would end on a star. Olbers' paradox reminds us that darkness itself is a clue.",
    takeaway:
      "The dark between the stars is evidence: finite age, expanding space, and finite stellar lifetimes.",
    tags: ["cosmos", "history"],
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}

/** Featured pocket lesson for the home Sky desk. */
export const featuredLesson = lessons[0];
