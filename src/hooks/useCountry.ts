"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  COUNTRY_STORAGE_KEY,
  getCountryByCode,
  hemisphereForCountry,
  readStoredCountryCode,
  writeStoredCountryCode,
  type CountryOption,
  type Hemisphere,
} from "@/lib/country";

function subscribe(onStoreChange: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === COUNTRY_STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("qw-country-change", onStoreChange as EventListener);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("qw-country-change", onStoreChange as EventListener);
  };
}

function getSnapshot(): string | null {
  return readStoredCountryCode();
}

function getServerSnapshot(): string | null {
  return null;
}

function notifyCountryChange() {
  window.dispatchEvent(new Event("qw-country-change"));
}

/**
 * Country for sky / games. `code` stays null until the visitor explicitly
 * picks one (localStorage `qw-country`). Never pretends they chose NG.
 */
export function useCountry() {
  const code = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const setCountry = useCallback((next: string) => {
    writeStoredCountryCode(next);
    notifyCountryChange();
  }, []);

  const hasCountry = hydrated && code !== null;
  const country: CountryOption | null = code ? getCountryByCode(code) : null;
  const hemisphere: Hemisphere | null = code ? hemisphereForCountry(code) : null;

  return {
    /** Stored code only — null until an explicit pick. */
    code,
    country,
    hemisphere,
    hasCountry,
    hydrated,
    setCountry,
    /** True after hydrate when localStorage has no valid country yet. */
    needsPrompt: hydrated && code === null,
  };
}
