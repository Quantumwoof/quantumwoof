"use client";

import { useCallback, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { SNIFFER_THRESHOLD, schoolTopics } from "@/content/woofSchool";

const STORAGE_KEY = "quantumwoof.woof-school.v1";
const STARTED_KEY = "quantumwoof.woof-school.startedAt";

export type WoofProgress = {
  /** Topic slugs that passed their woof check */
  woofed: string[];
  /** Topic slugs visited at least once */
  visited: string[];
};

const empty: WoofProgress = { woofed: [], visited: [] };

function readProgress(): WoofProgress {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<WoofProgress>;
    return {
      woofed: Array.isArray(parsed.woofed) ? parsed.woofed.filter(Boolean) : [],
      visited: Array.isArray(parsed.visited) ? parsed.visited.filter(Boolean) : [],
    };
  } catch {
    return empty;
  }
}

function writeProgress(next: WoofProgress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function readStartedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STARTED_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const now = Date.now();
    window.localStorage.setItem(STARTED_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function useWoofProgress() {
  const [progress, setProgress] = useState<WoofProgress>(empty);
  const [ready, setReady] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const hydrated = useHydrated();

  // Load saved progress once on the client (render-phase update, no extra commit).
  if (hydrated && !ready) {
    setReady(true);
    setProgress(readProgress());
    setStartedAt(readStartedAt());
  }

  const persist = useCallback((next: WoofProgress) => {
    setProgress(next);
    writeProgress(next);
  }, []);

  // Mutations start from localStorage (the source of truth), not this hook's
  // state: a child effect can run before this instance has loaded (e.g.
  // MarkVisited during hydration), and must not clobber saved progress.
  const markVisited = useCallback(
    (slug: string) => {
      setProgress(() => {
        const prev = readProgress();
        if (prev.visited.includes(slug)) return prev;
        const next = { ...prev, visited: [...prev.visited, slug] };
        writeProgress(next);
        return next;
      });
    },
    [],
  );

  const markWoofed = useCallback((slug: string) => {
    setProgress(() => {
      const prev = readProgress();
      const visited = prev.visited.includes(slug)
        ? prev.visited
        : [...prev.visited, slug];
      if (prev.woofed.includes(slug)) {
        const next = { ...prev, visited };
        writeProgress(next);
        return next;
      }
      const next = { woofed: [...prev.woofed, slug], visited };
      writeProgress(next);
      return next;
    });
  }, []);

  const isWoofed = useCallback(
    (slug: string) => progress.woofed.includes(slug),
    [progress.woofed],
  );

  const woofedCount = progress.woofed.filter((s) =>
    schoolTopics.some((t) => t.slug === s),
  ).length;

  const isSniffer = woofedCount >= SNIFFER_THRESHOLD;

  return {
    ready,
    progress,
    startedAt,
    woofedCount,
    totalTopics: schoolTopics.length,
    threshold: SNIFFER_THRESHOLD,
    isSniffer,
    isWoofed,
    markVisited,
    markWoofed,
    persist,
  };
}
