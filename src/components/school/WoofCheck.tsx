"use client";

import Link from "next/link";
import { useState } from "react";
import type { SchoolTopic } from "@/content/woofSchool";
import { useGuidedPath } from "@/hooks/useGuidedPath";
import { useWoofProgress } from "@/hooks/useWoofProgress";

type NextCourtyard = {
  slug: string;
  title: string;
  emoji: string;
};

type Props = {
  topic: SchoolTopic;
  /** Tighter chrome when nested inside TopicSlides */
  embedded?: boolean;
  /** Guided path: offer next live courtyard after a pass */
  nextCourtyard?: NextCourtyard | null;
};

type CheckRes = {
  ok: boolean;
  passed?: boolean;
  score?: number;
  passAt?: number;
  total?: number;
  results?: Record<
    string,
    { pick: "a" | "b" | "c" | null; correct: boolean; answer: "a" | "b" | "c" }
  >;
  error?: string;
  message?: string;
};

export function WoofCheck({ topic, embedded = false, nextCourtyard = null }: Props) {
  const check = topic.woofCheck;
  const { ready, isWoofed, markWoofed } = useWoofProgress();
  const { setGuidedCursor } = useGuidedPath();
  const already = isWoofed(topic.slug);

  const [picks, setPicks] = useState<Record<string, "a" | "b" | "c">>({});
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [passAtState, setPassAtState] = useState(check?.passAt ?? 0);
  const [results, setResults] = useState<CheckRes["results"]>();
  const [error, setError] = useState("");

  if (!check) return null;

  const passAt = passAtState || check.passAt;
  const allAnswered = check.questions.every((q) => picks[q.id]);
  const passed = (submitted && score >= passAt) || already;
  const label = topic.courtyardLabel ?? "courtyard";

  async function onCheck() {
    if (!allAnswered || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/woof-school/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.slug, answers: picks }),
      });
      const data = (await res.json()) as CheckRes;
      if (!data.ok) {
        setError(
          data.error === "forbidden_origin"
            ? "Hmm, that check got blocked — refresh the page and try again."
            : data.message || "Could not check your woof.",
        );
        setChecking(false);
        return;
      }
      setScore(data.score ?? 0);
      setPassAtState(data.passAt ?? check!.passAt);
      setResults(data.results);
      setSubmitted(true);
      if (data.passed) markWoofed(topic.slug);
    } catch {
      setError("Could not reach the woof check pad.");
    } finally {
      setChecking(false);
    }
  }

  function onRetry() {
    setPicks({});
    setSubmitted(false);
    setResults(undefined);
    setScore(0);
    setError("");
  }

  return (
    <section
      className={`rounded-2xl border border-electric/25 bg-electric/[0.06] p-5 sm:p-6 ${
        embedded ? "" : "mt-10"
      }`}
    >
      <p className="card-label mb-2">Tiny woof check</p>
      <h2 className="text-lg font-semibold text-white">
        {passAt} of {check.questions.length} = this {label} is woofed
      </h2>
      <p className="mt-1 text-sm text-slate">
        Tap an answer for each. Miss one? Re-read the lessons and try again — no shame-sniff.
      </p>

      {ready && already ? (
        <p className="mt-4 rounded-xl border border-lavender/30 bg-lavender/10 px-3 py-2 text-sm text-lavender">
          Already woofed ✓ — sniff again for fun if you want.
        </p>
      ) : null}

      <ol className="mt-5 space-y-5">
        {check.questions.map((q, i) => {
          const pick = picks[q.id];
          const result = results?.[q.id];
          const show = submitted && Boolean(result);
          const correct = Boolean(result?.correct);
          const rightId = result?.answer;
          return (
            <li key={q.id}>
              <p className="text-sm font-medium text-white">
                {i + 1}. {q.prompt}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {q.choices.map((c) => {
                  const selected = pick === c.id;
                  let ring = "border-white/15 hover:border-electric/40";
                  if (selected && !submitted) ring = "border-electric bg-electric/15";
                  if (show && rightId && c.id === rightId) ring = "border-electric bg-electric/20";
                  if (show && selected && !correct) ring = "border-rose-400/50 bg-rose-400/10";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (submitted || checking) return;
                        setPicks((p) => ({ ...p, [q.id]: c.id }));
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-sm text-slate transition ${ring}`}
                    >
                      <span className="font-mono text-electric-dim">{c.id})</span>{" "}
                      {c.text}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            disabled={!allAnswered || checking}
            onClick={() => void onCheck()}
            className="rounded-full bg-electric px-4 py-2 text-sm font-semibold text-navy transition hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checking ? "Checking…" : "Check my woof"}
          </button>
        ) : (
          <>
            <p
              className={`text-sm font-medium ${
                score >= passAt ? "text-electric" : "text-lavender"
              }`}
            >
              {score} / {check.questions.length}
              {score >= passAt
                ? ` — ${label} woofed. Good sniff.`
                : " — not yet. Re-read the lessons and try again."}
            </p>
            {score < passAt ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-electric/40"
              >
                Try again
              </button>
            ) : null}
          </>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-lavender">{error}</p> : null}

      {passed && nextCourtyard ? (
        <div className="mt-5 rounded-xl border border-electric/30 bg-electric/[0.08] p-4">
          <p className="text-sm text-slate">
            Courtyard woofed. Hosky’s next stop on the guided stroll:
          </p>
          <Link
            href={`/school/${nextCourtyard.slug}`}
            onClick={() => setGuidedCursor(nextCourtyard.slug, 0)}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-electric px-4 py-2 text-sm font-semibold text-navy transition hover:bg-electric-dim"
          >
            <span aria-hidden>{nextCourtyard.emoji}</span>
            Next courtyard · {nextCourtyard.title} →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
