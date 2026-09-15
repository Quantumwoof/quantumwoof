"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWoofProgress } from "@/hooks/useWoofProgress";
import {
  WOOFTAG_BOWL_FULL,
  WOOFTAG_CLAIM_LATER,
  WOOFTAG_MIN_GATE_MS,
  WOOFTAG_TIP_COPY,
  isWooftagFormat,
} from "@/lib/wooftag";

const TAG_KEY = "quantumwoof.wooftag.v1";
const QUEUE_KEY = "quantumwoof.wooftag.queue.v1";
const NAME_KEY = "quantumwoof.woof-school.sniffer-name";
const DATE_KEY = "quantumwoof.woof-school.sniffer-date";

type SavedTag = { tag: string; mintedAt: string };

type MintRes = {
  ok: boolean;
  status?: "minted" | "queued" | "already_issued";
  tag?: string;
  queueToken?: string;
  position?: number;
  remaining?: number;
  message?: string;
  error?: string;
  note?: string;
  claim?: string;
};

function readSaved(): SavedTag | null {
  try {
    const raw = window.localStorage.getItem(TAG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedTag>;
    if (typeof parsed.tag === "string" && isWooftagFormat(parsed.tag)) {
      return {
        tag: parsed.tag,
        mintedAt: typeof parsed.mintedAt === "string" ? parsed.mintedAt : "",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeSaved(tag: SavedTag) {
  window.localStorage.setItem(TAG_KEY, JSON.stringify(tag));
}

function readSnifferMeta(): { name: string; dateLabel: string } {
  try {
    return {
      name: window.localStorage.getItem(NAME_KEY) ?? "",
      dateLabel: window.localStorage.getItem(DATE_KEY) ?? "",
    };
  } catch {
    return { name: "", dateLabel: "" };
  }
}

export function WooftagMint() {
  const { ready, isSniffer, progress, startedAt } = useWoofProgress();
  const [saved, setSaved] = useState<SavedTag | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "waiting" | "stamping" | "queued" | "already" | "error"
  >("idle");
  const [queue, setQueue] = useState<{ token: string; position?: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [meta, setMeta] = useState({ name: "", dateLabel: "" });
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const existing = readSaved();
    if (existing) setSaved(existing);
    setMeta(readSnifferMeta());
    try {
      const q = window.localStorage.getItem(QUEUE_KEY);
      if (q) setQueue({ token: q });
    } catch {
      /* ignore */
    }
  }, [ready]);

  const copyTag = useCallback(async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !isSniffer || startedRef.current) return;
    startedRef.current = true;

    const existing = readSaved();
    if (existing) {
      setSaved(existing);
      void fetch("/api/wooftag/status").catch(() => undefined);
      return;
    }

    let cancelled = false;
    setPhase("waiting");

    (async () => {
      try {
        await fetch("/api/wooftag/status");
        if (cancelled) return;

        await new Promise((r) => setTimeout(r, WOOFTAG_MIN_GATE_MS + 400));
        if (cancelled) return;

        const postMint = async () => {
          const queueToken =
            (typeof window !== "undefined" && window.localStorage.getItem(QUEUE_KEY)) ||
            undefined;
          const mintRes = await fetch("/api/wooftag/mint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              woofed: progress.woofed,
              startedAt,
              queueToken: queueToken || undefined,
            }),
          });
          return (await mintRes.json()) as MintRes;
        };

        setPhase("stamping");
        let minted = await postMint();
        if (cancelled) return;

        if (minted.error === "too_fast") {
          setPhase("waiting");
          await new Promise((r) => setTimeout(r, WOOFTAG_MIN_GATE_MS));
          if (cancelled) return;
          setPhase("stamping");
          minted = await postMint();
          if (cancelled) return;
        }

        if (minted.status === "minted" && minted.tag && isWooftagFormat(minted.tag)) {
          const rec = { tag: minted.tag, mintedAt: new Date().toISOString() };
          writeSaved(rec);
          try {
            window.localStorage.removeItem(QUEUE_KEY);
          } catch {
            /* ignore */
          }
          setSaved(rec);
          setQueue(null);
          setPhase("idle");
          setMeta(readSnifferMeta());
          return;
        }

        if (minted.status === "queued") {
          if (minted.queueToken) {
            try {
              window.localStorage.setItem(QUEUE_KEY, minted.queueToken);
            } catch {
              /* ignore */
            }
            setQueue({ token: minted.queueToken, position: minted.position });
          }
          setPhase("queued");
          return;
        }

        if (minted.status === "already_issued") {
          setPhase("already");
          return;
        }

        setError(minted.message || "Hosky dropped the stamp.");
        setPhase("error");
      } catch {
        if (!cancelled) {
          setError("Could not reach the tip bowl.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, isSniffer, progress.woofed, startedAt]);

  if (!ready || !isSniffer) return null;

  // Status / mint APIs may still return minted/remaining/cap for ops — never show those to visitors.

  if (saved) {
    const snifferName = meta.name.trim() || "sniffer";
    return (
      <div className="mt-6 space-y-3">
        <div className="rounded-2xl border border-lavender/35 bg-lavender/[0.07] p-4 sm:p-5">
          <p className="card-label mb-1 text-lavender">Nebula Sniffer</p>
          <h3 className="text-lg font-semibold text-white sm:text-xl">
            You&apos;re sniffed, {snifferName}
          </h3>
          <p className="mt-1 text-sm text-slate">
            Cert unlocked{meta.dateLabel ? ` · ${meta.dateLabel}` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-electric/30 bg-electric/[0.06] p-4 sm:p-5">
          <p className="card-label mb-1 text-gold">Your Wooftag</p>
          <p className="break-all font-mono text-base tracking-wide text-white sm:text-lg">
            {saved.tag}
          </p>
          <p className="mt-3 inline-flex rounded-full border border-lavender/30 bg-lavender/10 px-2.5 py-0.5 text-xs text-lavender">
            Issued · {WOOFTAG_CLAIM_LATER.toLowerCase()}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <p className="card-label mb-3 text-slate-muted">What&apos;s next</p>
          <ol className="space-y-2.5">
            <li className="flex items-center gap-3 text-sm text-white">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/90 text-xs font-bold text-navy">
                1
              </span>
              Sniffed
            </li>
            <li className="flex items-center gap-3 text-sm text-white">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender text-xs font-bold text-navy">
                2
              </span>
              Tag issued — keep it safe
            </li>
            <li className="flex items-center gap-3 text-sm text-white">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xs font-bold text-slate-muted">
                3
              </span>
              Claim later → tip 1B Quantumwoof
            </li>
          </ol>
          <p className="mt-3 text-xs text-slate-muted">
            A thank-you tip later — not earnings.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void copyTag(saved.tag)}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-lavender px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-lavender-soft"
          >
            {copied ? "Copied" : "Copy Wooftag"}
          </button>
          <Link
            href="/school"
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-electric/35"
          >
            Back to campus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-electric/30 bg-electric/[0.07] p-4 sm:p-5">
      <p className="card-label mb-1">Wooftag · Hosky’s tip</p>
      <h3 className="text-lg font-semibold text-white">Issue only — not a Cardano send</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate">{WOOFTAG_TIP_COPY}</p>

      {phase === "waiting" ? (
        <p className="mt-4 text-sm text-slate">Warming the stamp pad…</p>
      ) : null}
      {phase === "stamping" ? (
        <p className="mt-4 text-sm text-electric">Stamping your Wooftag…</p>
      ) : null}
      {phase === "queued" ? (
        <div className="mt-4 rounded-xl border border-lavender/35 bg-lavender/10 px-3 py-2 text-sm text-lavender">
          <p>{WOOFTAG_BOWL_FULL}</p>
          <p className="mt-1 font-mono text-xs text-slate">Come back after 00:00 UTC</p>
        </div>
      ) : null}
      {phase === "already" ? (
        <p className="mt-4 text-sm text-slate">
          This browser already sniffed a Wooftag. If you don’t see it, the local copy was
          cleared — Hosky doesn’t reprint.
        </p>
      ) : null}
      {phase === "error" ? (
        <p className="mt-4 text-sm text-lavender">{error}</p>
      ) : null}
    </div>
  );
}
