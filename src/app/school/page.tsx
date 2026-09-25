import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CampusProgress } from "@/components/school/CampusProgress";
import { GuidedPathway } from "@/components/school/GuidedPathway";
import { SnifferCertificate } from "@/components/school/SnifferCertificate";
import { TopicStamp } from "@/components/school/TopicStamp";
import { schoolTopics, suggestedOrder } from "@/content/woofSchool";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Woof School · Hosky",
  description:
    "Open campus astronomy with Hosky — micro-lessons, tiny woof checks, Certified Nebula Sniffer.",
  path: "/school",
});

export default function SchoolCampusPage() {
  const bySlug = Object.fromEntries(schoolTopics.map((t) => [t.slug, t]));
  const ordered = suggestedOrder.map((s) => bySlug[s]).filter(Boolean);
  const ready = ordered.filter((t) => t.status === "ready");
  const later = ordered.filter((t) => t.status === "later");

  return (
    <div className="space-y-6 py-2">
      <header className="space-y-3">
        <p className="card-label">Open campus</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Woof School
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
          Open campus · pick a path. Guided sniff is recommended; the map stays free. Finish enough
          woof checks → <span className="text-lavender">Certified Nebula Sniffer</span>.
        </p>
      </header>

      <GuidedPathway />
      <CampusProgress />
      <SnifferCertificate />

      <section id="campus-map">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Campus map</h2>
          <p className="text-xs text-slate-muted">Always open · never a gate</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ready.map((topic, i) => (
            <Link
              key={topic.slug}
              href={`/school/${topic.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-electric/35 hover:bg-electric/[0.05]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[0.65rem] text-slate-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <TopicStamp slug={topic.slug} />
              </div>
              <p className="mt-2 text-xl" aria-hidden>
                {topic.emoji}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-white group-hover:text-electric-dim">
                {topic.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate">{topic.blurb}</p>
              <p className="mt-3 text-xs text-electric">
                {topic.lessons.length} slides · woof check →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {later.length > 0 ? (
        <section aria-label="Sniff later courtyards">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-muted">Sniff later</h2>
            <p className="text-[0.65rem] uppercase tracking-wide text-slate-muted">
              Not ready courtyards
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {later.map((topic) => (
              <div
                key={topic.slug}
                className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 opacity-70"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white/70">
                    <span aria-hidden className="mr-1.5">
                      {topic.emoji}
                    </span>
                    {topic.title}
                  </p>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-slate-muted">
                    Sniff later
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-muted">{topic.blurb}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <aside className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <Image
          src="/hosky-mark.png"
          alt=""
          width={40}
          height={40}
          className="rounded-full"
        />
        <p className="text-sm text-slate">
          Progress stamps and guided cursor live in your browser (localStorage). Clear site data
          and the stamps reset — the sky does not mind. A Wooftag issued on sniffer unlock is
          also backed up here; Hosky does not reprint lost tags.
        </p>
      </aside>
    </div>
  );
}
