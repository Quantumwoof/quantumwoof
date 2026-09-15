import Link from "next/link";
import { notes } from "@/content/notes";

export const metadata = {
  title: "Notes · Hosky",
  description: "Short notes from Hosky’s digital garden.",
};

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="card-label mb-2">Garden paths</p>
      <h1 className="text-3xl font-semibold tracking-tight text-white">Notes</h1>
      <p className="mt-2 text-slate">
        Field notes from the porch — short trails on sky, curiosity, and the
        occasional snack-shaped metaphor. Pull up a card; stay as long as the
        wonder lasts.
      </p>
      <ul className="mt-8 space-y-4">
        {notes.map((note) => (
          <li key={note.slug}>
            <Link
              href={`/notes/${note.slug}`}
              className="bento-card block p-5 transition hover:border-electric/30"
            >
              <p className="font-mono text-xs text-slate-muted">{note.date}</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{note.title}</h2>
              <p className="mt-2 text-sm text-slate">{note.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
