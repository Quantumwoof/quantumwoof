"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";

const KEY = "quantumwoof.install-nudge.dismissed.v1";

/**
 * Quiet, once-only “Add to Home Screen” tip — not a nag sheet.
 */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallNudge() {
  const hydrated = useHydrated();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  // Decide once on the client (render-phase update, no extra commit).
  if (hydrated && !checked) {
    setChecked(true);
    try {
      if (window.localStorage.getItem(KEY) !== "1" && !isStandalone()) setVisible(true);
    } catch {
      /* ignore */
    }
  }

  // Already running as an installed PWA → remember so the tip never shows.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (window.localStorage.getItem(KEY) !== "1" && isStandalone()) {
        window.localStorage.setItem(KEY, "1");
      }
    } catch {
      /* ignore */
    }
  }, [hydrated]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      className="rounded-2xl border border-lavender/35 bg-lavender/[0.07] p-4 sm:p-5"
      aria-label="Add to Home Screen tip"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="card-label mb-1 text-lavender">Quiet tip</p>
          <h2 className="text-base font-semibold text-white sm:text-lg">Add to Home Screen</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate">
            Install Quantumwoof like an app — free, no store. Works offline-ish.
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-slate-muted">
            <li>iPhone: Share → Add to Home Screen</li>
            <li>Android: menu → Install app</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-lavender px-4 py-2 text-sm font-semibold text-navy transition hover:bg-lavender-soft"
        >
          Got it
        </button>
      </div>
    </aside>
  );
}
