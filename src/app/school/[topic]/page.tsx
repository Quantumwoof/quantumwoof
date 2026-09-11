import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkVisited } from "@/components/school/MarkVisited";
import { TopicStamp } from "@/components/school/TopicStamp";
import { WoofCheck } from "@/components/school/WoofCheck";
import { getTopic, schoolTopics } from "@/content/woofSchool";

type Props = {
  params: Promise<{ topic: string }>;
};

export function generateStaticParams() {
  return schoolTopics.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: "Topic · Woof School" };
  return {
    title: `${topic.title} · Woof School`,
    description: topic.blurb,
  };
}

export default async function SchoolTopicPage({ params }: Props) {
  const { topic: slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  if (topic.status === "later") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-2">
        <Link href="/school" className="text-sm text-electric hover:text-white">
          ← Campus map
        </Link>
        <div className="bento-card p-6 sm:p-8">
          <p className="card-label mb-2">Sniff later</p>
          <p className="text-3xl" aria-hidden>
            {topic.emoji}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">{topic.title}</h1>
          <p className="mt-2 text-slate">{topic.blurb}</p>
          <p className="mt-4 text-sm text-slate-muted">
            Hosky has not opened this courtyard yet. Wander a ready path from the campus map —
            nine courtyards are open, including Go outside and Missions.
          </p>
          <Link
            href="/school"
            className="mt-6 inline-flex rounded-full bg-electric px-4 py-2 text-sm font-semibold text-navy"
          >
            Back to campus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <MarkVisited slug={topic.slug} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/school" className="text-sm text-electric hover:text-white">
          ← Campus map
        </Link>
        <TopicStamp slug={topic.slug} />
      </div>

      <header className="space-y-2">
        <p className="card-label">
          {topic.emoji} Courtyard · {topic.lessons.length} micro-lessons
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {topic.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate sm:text-base">{topic.blurb}</p>
      </header>

      <div className="space-y-8">
        {topic.lessons.map((lesson, idx) => (
          <article key={lesson.slug} className="bento-card overflow-hidden p-0">
            {lesson.image ? (
              <div className="relative aspect-[16/10] w-full border-b border-white/10 bg-[#0a1224]">
                <Image
                  src={lesson.image}
                  alt={lesson.imageAlt ?? lesson.title}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority={idx === 0}
                />
              </div>
            ) : null}
            <div className="space-y-3 p-5 sm:p-6">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-muted">
                Micro-lesson {idx + 1}
              </p>
              <h2 className="text-xl font-semibold text-white">{lesson.title}</h2>
              {lesson.body.map((p) => (
                <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-slate">
                  {p}
                </p>
              ))}
              {lesson.bullets && lesson.bullets.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate">
                  {lesson.bullets.map((b) => (
                    <li key={b.slice(0, 48)}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {lesson.after?.map((p) => (
                <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-slate">
                  {p}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <WoofCheck topic={topic} />

      <div className="flex flex-wrap gap-3 pb-4 text-sm">
        <Link href="/school" className="text-electric hover:text-white">
          ← All courtyards
        </Link>
      </div>
    </div>
  );
}
