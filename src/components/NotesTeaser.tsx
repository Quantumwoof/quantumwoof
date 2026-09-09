import Link from "next/link";
import { notes } from "@/content/notes";

export function NotesTeaser() {
  const teaser = notes.slice(0, 2);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Blog / notes</h2>
          <p className="mt-1 text-sm text-slate">Short trails through the garden.</p>
        </div>
        <Link
          href="/notes"
          className="shrink-0 text-sm text-electric transition hover:text-white"
        >
          All notes →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {teaser.map((note) => (
          <Link
            key={note.slug}
            href={`/notes/${note.slug}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-electric/30 hover:bg-electric/[0.04]"
          >
            <p className="font-mono text-[0.65rem] text-slate-muted">{note.date}</p>
            <h3 className="mt-1.5 text-sm font-semibold text-white group-hover:text-electric-dim">
              {note.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate">
              {note.excerpt}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {note.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-lavender/10 px-2 py-0.5 text-[0.65rem] text-lavender"
                >
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
