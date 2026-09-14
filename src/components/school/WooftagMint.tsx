"use client";

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
  const [revealed, setRevealed] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const existing = readSaved();
    if (existing) {
      setSaved(existing);
      setRevealed(true);
    }
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

        // Soft gate: wait out the server min-age so we don't look like a script.
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
          setRevealed(true);
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

  return (
    <div className="mt-6 rounded-2xl border border-electric/30 bg-electric/[0.07] p-4 sm:p-5">
      <p className="card-label mb-1">Wooftag · Hosky’s tip</p>
      <h3 className="text-lg font-semibold text-white">Issue only — not a Cardano send</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate">{WOOFTAG_TIP_COPY}</p>

      {saved ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-slate-muted">
            {revealed ? "Your Wooftag (this browser kept a copy)" : "Hidden — still saved here"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p
              className="rounded-xl border border-white/15 bg-navy-soft px-3 py-2 font-mono text-sm tracking-wide text-electric"
              aria-live="polite"
            >
              {revealed ? saved.tag : "WOOF-••••-••••-••••-••••"}
            </p>
            <button
              type="button"
              onClick={() => void copyTag(saved.tag)}
              className="rounded-full bg-electric px-3 py-1.5 text-sm font-semibold text-navy transition hover:bg-electric-dim"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white transition hover:border-electric/40"
            >
              {revealed ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-muted">
            Hosky prints plaintext once. Server stores only a hash.{" "}
            <span className="text-lavender">{WOOFTAG_CLAIM_LATER}</span>
          </p>
        </div>
      ) : null}

      {!saved && phase === "waiting" ? (
        <p className="mt-4 text-sm text-slate">Warming the stamp pad…</p>
      ) : null}
      {!saved && phase === "stamping" ? (
        <p className="mt-4 text-sm text-electric">Stamping your Wooftag…</p>
      ) : null}
      {!saved && phase === "queued" ? (
        <div className="mt-4 rounded-xl border border-lavender/35 bg-lavender/10 px-3 py-2 text-sm text-lavender">
          <p>{WOOFTAG_BOWL_FULL}</p>
          {queue?.position ? (
            <p className="mt-1 font-mono text-xs text-slate">
              Queue spot {queue.position} · come back after 00:00 UTC
            </p>
          ) : (
            <p className="mt-1 font-mono text-xs text-slate">Come back after 00:00 UTC</p>
          )}
        </div>
      ) : null}
      {!saved && phase === "already" ? (
        <p className="mt-4 text-sm text-slate">
          This browser already sniffed a Wooftag. If you don’t see it, the local copy was
          cleared — Hosky doesn’t reprint.
        </p>
      ) : null}
      {!saved && phase === "error" ? (
        <p className="mt-4 text-sm text-lavender">{error}</p>
      ) : null}
    </div>
  );
}
