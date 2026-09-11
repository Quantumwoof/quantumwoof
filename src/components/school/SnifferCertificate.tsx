"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useWoofProgress } from "@/hooks/useWoofProgress";

const NAME_KEY = "quantumwoof.woof-school.sniffer-name";
const DATE_KEY = "quantumwoof.woof-school.sniffer-date";

function todayLabel() {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function SnifferCertificate() {
  const { ready, isSniffer, woofedCount, totalTopics } = useWoofProgress();
  const [name, setName] = useState("");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    if (!ready || !isSniffer) return;
    try {
      const storedName = window.localStorage.getItem(NAME_KEY) ?? "";
      setName(storedName);
      let storedDate = window.localStorage.getItem(DATE_KEY);
      if (!storedDate) {
        storedDate = todayLabel();
        window.localStorage.setItem(DATE_KEY, storedDate);
      }
      setDateLabel(storedDate);
    } catch {
      setDateLabel(todayLabel());
    }
  }, [ready, isSniffer]);

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
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-lavender/30 bg-[#0a1224]">
          <Image
            src="/woof-school/nebula-sniffer-cert.jpeg"
            alt="Certified Nebula Sniffer certificate art"
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 520px"
            priority
          />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Certified Nebula Sniffer
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
            This husky confirms you sniffed enough nebulae to be dangerous at dinner parties.
            Coverage: {woofedCount}/{totalTopics} topics woofed.
          </p>

          <label className="mt-5 block text-xs uppercase tracking-wide text-slate-muted">
            Sniffer name
            <input
              type="text"
              value={name}
              placeholder="Your name (optional)"
              onChange={(e) => {
                const next = e.target.value.slice(0, 48);
                setName(next);
                try {
                  window.localStorage.setItem(NAME_KEY, next);
                } catch {
                  /* ignore */
                }
              }}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none ring-electric/40 placeholder:text-slate-muted focus:border-electric/40 focus:ring-2"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate">
              <span className="text-slate-muted">Name · </span>
              {name.trim() || "Anonymous sniffer"}
            </p>
            <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate">
              <span className="text-slate-muted">Date · </span>
              {dateLabel || "—"}
            </p>
          </div>

          <p className="mt-4 font-mono text-xs text-slate-muted">
            Hosky · QuantumWoof · open campus · not a boring diploma
          </p>
        </div>
      </div>
    </section>
  );
}
