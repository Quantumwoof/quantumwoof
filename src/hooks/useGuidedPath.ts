"use client";

import { useCallback, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { liveGuidedOrder } from "@/content/woofSchool";

const STORAGE_KEY = "quantumwoof.woof-school.pathway.v1";

export type PathwayMode = "guided" | "open";

export type GuidedPathState = {
  mode: PathwayMode | null;
  /** Current courtyard on the guided stroll */
  topicSlug: string | null;
  /** Lesson / check step index within that courtyard (0-based) */
  stepIndex: number;
};

const empty: GuidedPathState = {
  mode: null,
  topicSlug: null,
  stepIndex: 0,
};

function readPath(): GuidedPathState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<GuidedPathState>;
    const mode =
      parsed.mode === "guided" || parsed.mode === "open" ? parsed.mode : null;
    return {
      mode,
      topicSlug: typeof parsed.topicSlug === "string" ? parsed.topicSlug : null,
      stepIndex:
        typeof parsed.stepIndex === "number" &&
        Number.isFinite(parsed.stepIndex) &&
        parsed.stepIndex >= 0
          ? Math.floor(parsed.stepIndex)
          : 0,
    };
  } catch {
    return empty;
  }
}

function writePath(next: GuidedPathState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useGuidedPath() {
  const [path, setPath] = useState<GuidedPathState>(empty);
  const [ready, setReady] = useState(false);
  const hydrated = useHydrated();

  // Load the saved stroll once on the client (render-phase update, no extra commit).
  if (hydrated && !ready) {
    setReady(true);
    setPath(readPath());
  }

  const persist = useCallback((next: GuidedPathState) => {
    setPath(next);
    try {
      writePath(next);
    } catch {
      /* ignore quota */
    }
  }, []);

  const setMode = useCallback(
    (mode: PathwayMode) => {
      setPath((prev) => {
        const live = liveGuidedOrder();
        const topicSlug =
          mode === "guided"
            ? prev.topicSlug && live.some((t) => t.slug === prev.topicSlug)
              ? prev.topicSlug
              : (live[0]?.slug ?? null)
            : prev.topicSlug;
        const next: GuidedPathState = {
          mode,
          topicSlug,
          stepIndex: mode === "guided" ? prev.stepIndex : 0,
        };
        try {
          writePath(next);
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const setGuidedCursor = useCallback(
    (topicSlug: string, stepIndex: number) => {
      setPath((prev) => {
        if (prev.mode !== "guided") return prev;
        const next: GuidedPathState = {
          ...prev,
          topicSlug,
          stepIndex: Math.max(0, Math.floor(stepIndex)),
        };
        try {
          writePath(next);
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const continueHref =
    path.mode === "guided" && path.topicSlug
      ? `/school/${path.topicSlug}`
      : path.mode === "guided"
        ? `/school/${liveGuidedOrder()[0]?.slug ?? "looking-up"}`
        : null;

  return {
    ready,
    path,
    mode: path.mode,
    isGuided: path.mode === "guided",
    continueHref,
    setMode,
    setGuidedCursor,
    persist,
  };
}
