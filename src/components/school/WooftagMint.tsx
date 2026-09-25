"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { schoolTopics } from "@/content/woofSchool";
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
const SKIP_KEY = "quantumwoof.wooftag.x-claim-skip.v1";

type SavedTag = { tag: string; mintedAt: string };

type MintRes = {
  ok: boolean;
  status?: string;
  tag?: string;
  queueToken?: string;
  position?: number;
  message?: string;
  error?: string;
  missingTopics?: string[];
};

type StatusRes = {
  ok?: boolean;
  missingTopics?: string[];
  schoolComplete?: boolean;
  xClaimEnabled?: boolean;
  xSignedIn?: boolean;
  xUsername?: string;
  dayMissingTopics?: string[];
  daySchoolComplete?: boolean;
  nextClaimAt?: string;
};

type SessionRes = {
  ok?: boolean;
  enabled?: boolean;
  signedIn?: boolean;
  username?: string;
  claimedToday?: boolean;
  tag?: string;
  issuedAt?: string;
  history?: { utcDate: string; issuedAt: string; tag: string }[];
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

function topicTitle(slug: string): string {
  return schoolTopics.find((t) => t.slug === slug)?.title ?? slug;
}

function formatNextClaimLocal(iso?: string): string {
  if (!iso) return "after 00:00 UTC";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WooftagMint() {
  const { ready, isSniffer, progress, startedAt } = useWoofProgress();
  const [saved, setSaved] = useState<SavedTag | null>(null);
  const [phase, setPhase] = useState<
    | "idle"
    | "waiting"
    | "stamping"
    | "queued"
    | "already"
    | "error"
    | "needs_checks"
    | "x_offer"
    | "x_claiming"
  >("idle");
  const [queue, setQueue] = useState<{ token: string; position?: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [missingTopics, setMissingTopics] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [meta, setMeta] = useState({ name: "", dateLabel: "" });
  const [xClaimEnabled, setXClaimEnabled] = useState(false);
  const [xSignedIn, setXSignedIn] = useState(false);
  const [xUsername, setXUsername] = useState("");
  const [dayMissing, setDayMissing] = useState<string[]>([]);
  const [nextClaimAt, setNextClaimAt] = useState<string | undefined>();
  const [skipped, setSkipped] = useState(false);
  const [history, setHistory] = useState<
    { utcDate: string; issuedAt: string; tag: string }[]
  >([]);
  const startedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  /** `x_auth` result from the OAuth callback redirect, read once. */
  const [xAuth, setXAuth] = useState<string | null>(null);

  // Load saved tag / cert meta / queue token once progress is ready
  // (render-phase update, no extra commit).
  if (ready && !loaded) {
    setLoaded(true);
    const existing = readSaved();
    if (existing) setSaved(existing);
    setMeta(readSnifferMeta());
    try {
      const q = window.localStorage.getItem(QUEUE_KEY);
      if (q) setQueue({ token: q });
      setSkipped(window.localStorage.getItem(SKIP_KEY) === "1");
    } catch {
      /* ignore */
    }

    // Back from X sign-in: show the result (side effects run in the effect below).
    try {
      const u = new URL(window.location.href);
      const auth = u.searchParams.get("x_auth");
      if (auth) {
        setXAuth(auth);
        if (auth === "ok") {
          setSkipped(false);
          setPhase("x_offer");
        } else if (auth === "ineligible") {
          const reason = u.searchParams.get("reason") ?? "";
          setError(
            reason === "too_new"
              ? "This X account is too new for a Wooftag tip."
              : reason === "inactive"
                ? "This X account looks too quiet for a tip just yet."
                : "This X account isn’t eligible for a Wooftag tip right now.",
          );
          setPhase("x_offer");
        } else if (auth === "state") {
          setError("Sign-in didn’t line up — please try Claim with X again.");
          setPhase("x_offer");
        } else if (auth !== "disabled") {
          setError("Sign-in didn’t finish — you can try again or keep learning.");
          setPhase("x_offer");
        }
      }
    } catch {
      /* ignore */
    }
  }

  const copyTag = useCallback(async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, []);

  const refreshXSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/x/session");
      const json = (await res.json()) as SessionRes;
      if (!json.enabled) return;
      setXSignedIn(Boolean(json.signedIn));
      setXUsername(json.username ?? "");
      setHistory(Array.isArray(json.history) ? json.history : []);
      if (json.claimedToday && json.tag && isWooftagFormat(json.tag)) {
        const rec = {
          tag: json.tag,
          mintedAt: json.issuedAt || new Date().toISOString(),
        };
        writeSaved(rec);
        setSaved(rec);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!xAuth) return;
    // False positive: refreshXSession only sets state after awaiting fetch().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (xAuth === "ok") void refreshXSession();
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("x_auth");
      u.searchParams.delete("reason");
      u.searchParams.delete("u");
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch {
      /* ignore */
    }
  }, [xAuth, refreshXSession]);

  useEffect(() => {
    if (!ready || !isSniffer || startedRef.current) return;
    startedRef.current = true;

    // A saved tag was already loaded into state above — just refresh X info.
    if (readSaved()) {
      void fetch("/api/wooftag/status")
        .then((r) => r.json())
        .then((s: StatusRes) => {
          setXClaimEnabled(Boolean(s.xClaimEnabled));
          setNextClaimAt(s.nextClaimAt);
          setDayMissing(Array.isArray(s.dayMissingTopics) ? s.dayMissingTopics : []);
          if (s.xClaimEnabled) void refreshXSession();
        })
        .catch(() => undefined);
      return;
    }

    let cancelled = false;

    (async () => {
      setPhase("waiting");
      try {
        const statusRes = await fetch("/api/wooftag/status");
        const statusJson = (await statusRes.json()) as StatusRes;
        if (cancelled) return;

        const xOn = Boolean(statusJson.xClaimEnabled);
        setXClaimEnabled(xOn);
        setNextClaimAt(statusJson.nextClaimAt);
        setDayMissing(
          Array.isArray(statusJson.dayMissingTopics)
            ? statusJson.dayMissingTopics
            : [],
        );

        if (xOn) {
          await refreshXSession();
          if (cancelled) return;
          try {
            if (window.localStorage.getItem(SKIP_KEY) === "1") {
              setSkipped(true);
              setPhase("idle");
              return;
            }
          } catch {
            /* ignore */
          }
          setPhase("x_offer");
          return;
        }

        const missing = Array.isArray(statusJson.missingTopics)
          ? statusJson.missingTopics
          : [];
        if (missing.length > 0) {
          setMissingTopics(missing);
          setPhase("needs_checks");
          return;
        }

        await new Promise((r) => setTimeout(r, WOOFTAG_MIN_GATE_MS + 400));
        if (cancelled) return;

        const postMint = async () => {
          const queueToken =
            (typeof window !== "undefined" &&
              window.localStorage.getItem(QUEUE_KEY)) ||
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

        if (minted.error === "forbidden_origin") {
          setError("Hmm, that request got blocked — refresh the page and try again.");
          setPhase("error");
          return;
        }

        if (minted.error === "sign_in_required") {
          setPhase("x_offer");
          return;
        }

        if (minted.error === "school_incomplete") {
          setMissingTopics(
            Array.isArray(minted.missingTopics) ? minted.missingTopics : [],
          );
          setPhase("needs_checks");
          return;
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
      // Let a re-run (Strict Mode remount, dependency change) start over instead
      // of leaving the cancelled flow stuck on "waiting".
      startedRef.current = false;
    };
  }, [ready, isSniffer, progress.woofed, startedAt, refreshXSession]);

  const claimWithX = useCallback(async () => {
    setError("");
    setPhase("x_claiming");
    try {
      const res = await fetch("/api/wooftag/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as MintRes;
      if (
        (json.status === "claimed" || json.status === "already_claimed") &&
        json.tag &&
        isWooftagFormat(json.tag)
      ) {
        const rec = { tag: json.tag, mintedAt: new Date().toISOString() };
        writeSaved(rec);
        setSaved(rec);
        setPhase("idle");
        await refreshXSession();
        return;
      }
      if (json.error === "forbidden_origin") {
        setError("Hmm, that request got blocked — refresh the page and try again.");
        setPhase("x_offer");
        return;
      }
      if (json.error === "school_incomplete") {
        setDayMissing(Array.isArray(json.missingTopics) ? json.missingTopics : []);
        setPhase("x_offer");
        setError(json.message || "Pass today’s woof checks first.");
        return;
      }
      if (json.error === "browser_already_claimed_today") {
        setError(
          json.message ||
            "This browser already claimed today’s Wooftag. Come back after 1 AM Lagos / midnight UTC.",
        );
        setPhase("x_offer");
        return;
      }
      if (json.error === "browser_required") {
        setError(
          json.message ||
            "Refresh this page and pass today’s woof checks in this browser, then claim.",
        );
        setPhase("x_offer");
        return;
      }
      if (json.error === "sign_in_required") {
        // Full-page navigation on purpose: /api/auth/x/start is a route handler
        // that redirects to X for OAuth — router.push() cannot follow that.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/api/auth/x/start";
        return;
      }
      if (json.status === "queued") {
        setPhase("queued");
        return;
      }
      setError(json.message || "Could not claim today’s Wooftag.");
      setPhase("x_offer");
    } catch {
      setError("Could not reach the tip bowl.");
      setPhase("x_offer");
    }
  }, [refreshXSession]);

  const skipClaim = useCallback(() => {
    try {
      window.localStorage.setItem(SKIP_KEY, "1");
    } catch {
      /* ignore */
    }
    setSkipped(true);
    setPhase("idle");
  }, []);

  const nextClaimLocal = useMemo(
    () => formatNextClaimLocal(nextClaimAt),
    [nextClaimAt],
  );

  if (!ready || !isSniffer) return null;

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
          {xClaimEnabled ? (
            <p className="mt-3 text-xs leading-relaxed text-slate">
              You can sign in daily to claim a Wooftag — pass today&apos;s Woof School
              quizzes, then claim. Next claim opens {nextClaimLocal}.
            </p>
          ) : null}
        </div>

        {xClaimEnabled && history.length > 1 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <p className="card-label mb-2 text-slate-muted">Past daily claims</p>
            <ul className="space-y-1.5 font-mono text-xs text-slate">
              {history.slice(0, 8).map((h) => (
                <li key={h.utcDate} className="break-all">
                  {h.utcDate} · {h.tag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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

  if (xClaimEnabled && (phase === "x_offer" || phase === "x_claiming" || skipped)) {
    return (
      <div className="mt-6 space-y-3">
        <div className="rounded-2xl border border-lavender/35 bg-lavender/[0.07] p-4 sm:p-5">
          <p className="card-label mb-1 text-lavender">Nebula Sniffer</p>
          <h3 className="text-lg font-semibold text-white sm:text-xl">
            Cert unlocked — learning stays open
          </h3>
          <p className="mt-1 text-sm text-slate">
            No sign-in needed for Woof School or your certificate.
          </p>
        </div>

        {!skipped ? (
          <div className="rounded-2xl border border-electric/30 bg-electric/[0.07] p-4 sm:p-5">
            <p className="card-label mb-1">Optional · Claim with X</p>
            <h3 className="text-lg font-semibold text-white">
              Claim your Wooftag with X
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              You can sign in daily to claim a Wooftag — pass today&apos;s Woof School
              quizzes, then claim. Next claim opens {nextClaimLocal}.
            </p>
            <p className="mt-2 text-xs text-slate-muted">
              We only read your public profile (no posting).{" "}
              <Link
                href="/privacy"
                className="text-electric underline-offset-2 hover:underline"
              >
                Privacy
              </Link>
            </p>

            {dayMissing.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-lavender">
                  Pass today&apos;s woof checks before claiming:
                </p>
                <ul className="flex flex-col gap-2">
                  {dayMissing.map((slug) => (
                    <li key={slug}>
                      <Link
                        href={`/school/${slug}`}
                        className="inline-flex rounded-full border border-electric/35 bg-electric/10 px-3 py-1.5 text-sm text-electric transition hover:border-electric/60"
                      >
                        Today&apos;s check · {topicTitle(slug)} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-lavender">{error}</p> : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {xSignedIn ? (
                <button
                  type="button"
                  disabled={phase === "x_claiming" || dayMissing.length > 0}
                  onClick={() => void claimWithX()}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-lavender px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-lavender-soft disabled:opacity-50"
                >
                  {phase === "x_claiming"
                    ? "Claiming…"
                    : xUsername
                      ? `Claim today’s tip (@${xUsername})`
                      : "Claim today’s tip"}
                </button>
              ) : (
                <a
                  href="/api/auth/x/start"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-lavender px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-lavender-soft"
                >
                  Sign in with X to claim
                </a>
              )}
              <button
                type="button"
                onClick={skipClaim}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-electric/35"
              >
                Maybe later / just learning
              </button>
            </div>
            {xSignedIn ? (
              <button
                type="button"
                className="mt-2 text-xs text-slate-muted underline-offset-2 hover:underline"
                onClick={() => {
                  void fetch("/api/auth/x/signout", { method: "POST" }).then(() => {
                    setXSignedIn(false);
                    setXUsername("");
                  });
                }}
              >
                Sign out of X
              </button>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <p className="text-sm text-slate">
              Tip claim skipped — keep sniffing whenever you like. You can claim later
              from this page.
            </p>
            <button
              type="button"
              className="mt-3 text-sm text-electric underline-offset-2 hover:underline"
              onClick={() => {
                try {
                  window.localStorage.removeItem(SKIP_KEY);
                } catch {
                  /* ignore */
                }
                setSkipped(false);
                setPhase("x_offer");
              }}
            >
              Show claim option
            </button>
          </div>
        )}
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
      {phase === "needs_checks" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-lavender">
            Your local progress is saved, but Hosky still needs a fresh woof check for
            {missingTopics.length === 1 ? " this courtyard" : " these courtyards"} before
            issuing a Wooftag. Pass each check once more (answers stay the same).
          </p>
          <ul className="flex flex-col gap-2">
            {missingTopics.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/school/${slug}`}
                  className="inline-flex rounded-full border border-electric/35 bg-electric/10 px-3 py-1.5 text-sm text-electric transition hover:border-electric/60"
                >
                  Re-check · {topicTitle(slug)} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {phase === "error" ? (
        <p className="mt-4 text-sm text-lavender">{error}</p>
      ) : null}
      {queue ? null : null}
    </div>
  );
}
