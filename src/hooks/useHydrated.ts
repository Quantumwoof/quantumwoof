"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the hydration pass, true on the client afterwards —
 * the lint-clean replacement for `useEffect(() => setHydrated(true), [])`.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
