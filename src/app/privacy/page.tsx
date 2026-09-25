import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy · QuantumWoof",
  description:
    "How QuantumWoof handles Wooftag minting, optional X sign-in, and learning data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <header className="space-y-2">
        <p className="card-label">Trust · porch rules</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Privacy</h1>
        <p className="text-sm leading-relaxed text-slate sm:text-base">
          Short version: Woof School stays open with no account. Optional X sign-in is
          only for claiming a daily Wooftag tip — we never post for you.
        </p>
      </header>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">What we collect</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate">
          <li>
            Browser cookies for Wooftag gate timing, queue position, and a durable
            browser id so tips can&apos;t be reminted by clearing local storage alone.
          </li>
          <li>
            Server-side woof-check stamps (topic ids) tied to that browser id — used to
            authorize minting / daily claims.
          </li>
          <li>
            Hashes of issued Wooftags (not the plaintext tip string for anonymous mint).
          </li>
          <li>
            Optional X claim: your X user id, username, account created date, and an
            encrypted copy of each daily tip so you can re-open past claims after
            signing in. Access tokens from X are discarded after reading{" "}
            <code className="text-electric">/users/me</code>.
          </li>
          <li>
            Optional X claim, per browser: a short-lived (about 48 hours) marker that
            this browser id claimed today&apos;s Wooftag, so each browser gets at most
            one daily claim.
          </li>
          <li>Standard hosting / analytics signals on Vercel (page views).</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">What we do not do</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate">
          <li>We do not post tweets or read your DMs.</li>
          <li>We do not sell personal data.</li>
          <li>We do not require X to learn or earn a Nebula Sniffer certificate.</li>
          <li>We do not send Cardano transactions from this site when issuing a tip.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">X scopes</h2>
        <p className="text-sm leading-relaxed text-slate">
          When claim-with-X is enabled, sign-in asks only for{" "}
          <code className="text-electric">users.read</code> and{" "}
          <code className="text-electric">tweet.read</code> (needed for public profile
          metrics). No offline access; no write scopes.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Contact</h2>
        <p className="text-sm leading-relaxed text-slate">
          Questions:{" "}
          <a
            href="mailto:hello@quantumwoof.io"
            className="text-electric underline-offset-2 hover:underline"
          >
            hello@quantumwoof.io
          </a>
          . Back to{" "}
          <Link href="/school" className="text-electric underline-offset-2 hover:underline">
            Woof School
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
