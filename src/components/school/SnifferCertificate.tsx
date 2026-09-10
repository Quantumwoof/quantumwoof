"use client";

import Image from "next/image";
import { useWoofProgress } from "@/hooks/useWoofProgress";

export function SnifferCertificate() {
  const { ready, isSniffer, woofedCount, totalTopics } = useWoofProgress();

  if (!ready || !isSniffer) return null;

  return (
    <section
      id="certificate"
      className="bento-card relative overflow-hidden p-6 sm:p-8"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-lavender/15 via-transparent to-electric/10"
        aria-hidden
      />
      <p className="card-label relative mb-2">Certificate sticker</p>
      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Image
          src="/hosky-mark.png"
          alt="Hosky"
          width={72}
          height={72}
          className="rounded-full ring-2 ring-lavender/40"
        />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Certified Nebula Sniffer
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
            This husky confirms you sniffed enough nebulae to be dangerous at dinner parties.
            Coverage: {woofedCount}/{totalTopics} topics woofed.
          </p>
          <p className="mt-3 font-mono text-xs text-slate-muted">
            Hosky · QuantumWoof · open campus · not a boring diploma
          </p>
        </div>
      </div>
    </section>
  );
}
