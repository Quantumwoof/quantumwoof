import Link from "next/link";
import {
  getTopic,
  schoolTopics,
  SNIFFER_THRESHOLD,
  type SchoolTopic,
} from "@/content/woofSchool";

/** Featured courtyards for the home teaser — keep short; full map lives on /school. */
const FEATURED_SLUGS = ["looking-up", "our-backyard", "solar-system"] as const;

export function SkyDesk() {
  const featured: SchoolTopic[] = FEATURED_SLUGS.map((s) => getTopic(s)).filter(
    (t): t is SchoolTopic => t != null && t.status === "ready",
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Sky desk · Woof School</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate">
            Open campus astronomy with Hosky — chill micro-lessons, tiny woof checks, and a silly
            title when you sniff enough courtyards:{" "}
            <span className="text-lavender">Certified Nebula Sniffer</span> ({SNIFFER_THRESHOLD}/
            {schoolTopics.length}). Wander free; the full map lives on campus.
          </p>
        </div>
        <Link
          href="/school"
          className="shrink-0 rounded-full bg-electric px-4 py-2 text-sm font-semibold text-navy transition hover:bg-electric-dim"
        >
          Enter campus →
        </Link>
      </div>

      {featured.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {featured.map((t) => (
            <Link
              key={t.slug}
              href={`/school/${t.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-electric/35 hover:bg-electric/[0.05]"
            >
              <p className="text-xl" aria-hidden>
                {t.emoji}
              </p>
              <h3 className="mt-2 text-sm font-semibold text-white group-hover:text-electric-dim">
                {t.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate">{t.blurb}</p>
              <p className="mt-3 text-xs text-electric">Peek path →</p>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-muted">
        More courtyards, guided stroll, and sniffer progress on{" "}
        <Link href="/school" className="text-electric hover:text-white">
          /school
        </Link>
        . Field notes still live at{" "}
        <Link href="/notes" className="text-electric hover:text-white">
          /notes
        </Link>
        .
      </p>
    </div>
  );
}
