import Link from "next/link";
import { notFound } from "next/navigation";
import { getNote, notes } from "@/content/notes";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return notes.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return { title: "Note · Hosky" };
  return {
    title: `${note.title} · Hosky`,
    description: note.excerpt,
  };
}

export default async function NotePage({ params }: Props) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link
        href="/notes"
        className="text-sm text-electric transition hover:text-white"
      >
        ← All notes
      </Link>
      <p className="mt-6 font-mono text-xs text-slate-muted">{note.date}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {note.title}
      </h1>
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
      <div className="prose-garden mt-8 space-y-4 text-[0.95rem]">
        {note.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  );
}
