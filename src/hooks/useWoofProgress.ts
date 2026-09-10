"use client";

import { useCallback, useEffect, useState } from "react";
import { SNIFFER_THRESHOLD, schoolTopics } from "@/content/woofSchool";

const STORAGE_KEY = "quantumwoof.woof-school.v1";

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

export function useWoofProgress() {
  const [progress, setProgress] = useState<WoofProgress>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(readProgress());
    setReady(true);
  }, []);

  const persist = useCallback((next: WoofProgress) => {
    setProgress(next);
    writeProgress(next);
  }, []);

  const markVisited = useCallback(
    (slug: string) => {
      setProgress((prev) => {
        if (prev.visited.includes(slug)) return prev;
        const next = { ...prev, visited: [...prev.visited, slug] };
        writeProgress(next);
        return next;
      });
    },
    [],
  );

  const markWoofed = useCallback((slug: string) => {
    setProgress((prev) => {
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
