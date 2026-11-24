import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms · QuantumWoof",
  description:
    "House rules for QuantumWoof: free and for fun, Wooftags have no cash value, keep leaderboard names decent.",
  path: "/terms",
});

const link = "text-electric underline-offset-2 hover:underline";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <header className="space-y-2">
        <p className="card-label">Trust · house rules</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Terms</h1>
        <p className="text-sm leading-relaxed text-slate sm:text-base">
          Short version: QuantumWoof is a free place to learn about the sky and play with
          Hosky. Be kind, have fun, and don&apos;t treat anything here as money.
        </p>
        <p className="text-xs text-slate-muted">Last updated 24 Nov 2026</p>
      </header>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Free and for fun</h2>
        <p className="text-sm leading-relaxed text-slate">
          Woof School, the notes, and the Hosky Star Form game are free to use, with no
          account needed. They&apos;re here for learning and play, wherever you are in the
          world.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Wooftags and tips</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate">
          <li>Wooftags and tips are a fun thank-you for finishing Woof School.</li>
          <li>They have no cash value and can&apos;t be exchanged for money.</li>
          <li>
            They are not an investment, a token, or any kind of financial product, and
            nothing on this site is financial advice.
          </li>
          <li>Daily limits apply, and we may change or end Wooftags at any time.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate">
          <li>
            Names and social handles on the Star Form board are public, so keep them
            decent: nothing rude, hateful, or pretending to be someone else.
          </li>
          <li>We may remove any name, handle, or score that breaks these rules.</li>
          <li>Play fair. Runs that look automated or tampered with may be removed.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">As-is</h2>
        <p className="text-sm leading-relaxed text-slate">
          The site is provided as-is, with no guarantees. We try to keep the science
          right and the site running, but things can break, change, or go offline, and
          scores or tips may be reset if something goes wrong.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Privacy and contact</h2>
        <p className="text-sm leading-relaxed text-slate">
          How we handle data is on the{" "}
          <Link href="/privacy" className={link}>
            privacy page
          </Link>
          . Questions:{" "}
          <a href="mailto:hello@quantumwoof.io" className={link}>
            hello@quantumwoof.io
          </a>
          . Back to{" "}
          <Link href="/" className={link}>
            home
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
