import Link from "next/link";
import { READY_TOPIC_COUNT, SNIFFER_THRESHOLD } from "@/content/woofSchool";

/** Home campus CTA — teaser only, zero topic cards. */
export function HomeCampusTeaser() {
  const ready = READY_TOPIC_COUNT;
  return (
    <div className="space-y-4">
      <p className="card-label text-gold">Woof School</p>
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Open campus</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-slate">
        Sniff courtyards. Unlock{" "}
        <span className="text-lavender">Certified Nebula Sniffer</span> ({SNIFFER_THRESHOLD}/
        {READY_TOPIC_COUNT}). {ready} ready paths — no topic dump on home.
      </p>
      <Link
        href="/school"
        className="inline-flex w-full items-center justify-center rounded-full bg-gold px-5 py-3 text-sm font-semibold text-navy transition hover:bg-gold-dim sm:w-auto"
      >
        Enter campus
      </Link>
    </div>
  );
}
