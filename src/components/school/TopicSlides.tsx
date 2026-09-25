"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { SchoolTopic } from "@/content/woofSchool";
import { nextLiveTopic } from "@/content/woofSchool";
import { useGuidedPath } from "@/hooks/useGuidedPath";
import { WoofCheck } from "@/components/school/WoofCheck";

type Props = {
  topic: SchoolTopic;
};

export function TopicSlides({ topic }: Props) {
  const lessons = topic.lessons;
  const hasCheck = Boolean(topic.woofCheck);
  const totalSteps = lessons.length + (hasCheck ? 1 : 0);

  const { ready: pathReady, isGuided, path, setGuidedCursor } = useGuidedPath();
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);

  // Restore the guided-stroll cursor once the saved path is loaded
  // (render-phase update, no extra commit).
  if (pathReady && !restored) {
    setRestored(true);
    if (
      isGuided &&
      path.topicSlug === topic.slug &&
      path.stepIndex >= 0 &&
      path.stepIndex < totalSteps
    ) {
      setStep(path.stepIndex);
    } else if (isGuided) {
      // Entering a new courtyard on the guided path — park the cursor here at lesson 1.
      setGuidedCursor(topic.slug, 0);
    }
  }

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, next));
      setStep(clamped);
      if (isGuided) setGuidedCursor(topic.slug, clamped);
    },
    [totalSteps, isGuided, setGuidedCursor, topic.slug],
  );

  const onLesson = step < lessons.length;
  const lesson = onLesson ? lessons[step] : null;
  const nextCourtyard = useMemo(() => nextLiveTopic(topic.slug), [topic.slug]);

  const progressLabel = onLesson
    ? `Lesson ${step + 1} of ${lessons.length}`
    : "Tiny woof check";

  if (totalSteps === 0) {
    return (
      <p className="text-sm text-slate-muted">
        Hosky left this courtyard empty for now. Wander back to campus.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-muted">
          {progressLabel}
        </p>
        <div
          className="flex items-center gap-1.5"
          aria-label={`Step ${step + 1} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === step
                  ? "scale-125 bg-electric"
                  : i < step
                    ? "bg-electric/50"
                    : "bg-white/20"
              }`}
              aria-label={
                i < lessons.length
                  ? `Go to lesson ${i + 1}`
                  : "Go to tiny woof check"
              }
              aria-current={i === step ? "step" : undefined}
            />
          ))}
        </div>
      </div>

      {lesson ? (
        <article className="bento-card overflow-hidden p-0">
          {lesson.image ? (
            <div className="relative aspect-[16/10] w-full border-b border-white/10 bg-[#0a1224]">
              <Image
                src={lesson.image}
                alt={lesson.imageAlt ?? lesson.title}
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 768px"
                priority={step === 0}
              />
            </div>
          ) : null}
          <div className="space-y-3 p-5 sm:p-6">
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-muted">
              Micro-lesson {step + 1}
            </p>
            <h2 className="text-xl font-semibold text-white">{lesson.title}</h2>
            {lesson.body.map((p) => (
              <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-slate">
                {p}
              </p>
            ))}
            {lesson.bullets && lesson.bullets.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate">
                {lesson.bullets.map((b) => (
                  <li key={b.slice(0, 48)}>{b}</li>
                ))}
              </ul>
            ) : null}
            {lesson.after?.map((p) => (
              <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-slate">
                {p}
              </p>
            ))}
          </div>
        </article>
      ) : null}

      {!onLesson && hasCheck ? (
        <WoofCheck
          topic={topic}
          embedded
          nextCourtyard={
            isGuided && nextCourtyard
              ? {
                  slug: nextCourtyard.slug,
                  title: nextCourtyard.title,
                  emoji: nextCourtyard.emoji,
                }
              : null
          }
        />
      ) : null}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-navy/90 px-3 py-2.5 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-electric/40 disabled:cursor-not-allowed disabled:opacity-35"
        >
          ← Back
        </button>
        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="rounded-full bg-electric px-4 py-2 text-sm font-semibold text-navy transition hover:bg-electric-dim"
          >
            {step === lessons.length - 1 && hasCheck ? "Tiny woof check →" : "Next →"}
          </button>
        ) : (
          <Link
            href="/school"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-electric transition hover:border-electric/40 hover:text-white"
          >
            Campus map
          </Link>
        )}
      </div>
    </div>
  );
}
