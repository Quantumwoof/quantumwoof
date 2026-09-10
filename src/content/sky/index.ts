/**
 * Sky desk content module — lessons + field notes share one folder
 * and feed the same home section /notes hub templates.
 */
export { lessons, getLesson, featuredLesson, type Lesson } from "./lessons";
export { notes, getNote, type Note } from "./notes";

export type SkyKind = "lesson" | "note";

export type SkyItem = {
  kind: SkyKind;
  slug: string;
  title: string;
  teaser: string;
  href: string;
  meta: string;
  tags: string[];
};

import { lessons } from "./lessons";
import { notes } from "./notes";

/** Flat list for compact Sky desk previews (newest-feeling first). */
export function getSkyDeskItems(): SkyItem[] {
  const lessonItems: SkyItem[] = lessons.map((l) => ({
    kind: "lesson" as const,
    slug: l.slug,
    title: l.title,
    teaser: l.summary,
    href: `/notes#lesson-${l.slug}`,
    meta: "Mini lesson",
    tags: l.tags,
  }));
  const noteItems: SkyItem[] = notes.map((n) => ({
    kind: "note" as const,
    slug: n.slug,
    title: n.title,
    teaser: n.excerpt,
    href: `/notes/${n.slug}`,
    meta: n.date,
    tags: n.tags,
  }));
  // Interleave: featured lesson, then notes chronologically, remaining lessons
  const [featured, ...restLessons] = lessonItems;
  const sortedNotes = [...noteItems].sort((a, b) => b.meta.localeCompare(a.meta));
  return [featured, ...sortedNotes, ...restLessons].filter(Boolean);
}
