import Link from "next/link";
import { schoolTopics, SNIFFER_THRESHOLD } from "@/content/woofSchool";

export function SkyDesk() {
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

      <p className="text-xs text-slate-muted">
        Courtyards, guided stroll, and sniffer progress on{" "}
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
