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
        Sample posts for the garden. Replace or extend in{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-sm text-electric-dim">
          src/content/notes.ts
        </code>
        .
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
