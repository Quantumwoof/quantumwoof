"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  COUNTRY_STORAGE_KEY,
  DEFAULT_COUNTRY_CODE,
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

  const country: CountryOption = getCountryByCode(code ?? DEFAULT_COUNTRY_CODE);
  const hemisphere: Hemisphere = hemisphereForCountry(code ?? DEFAULT_COUNTRY_CODE);
  const hasCountry = hydrated && code !== null;

  return {
    code: code ?? (hydrated ? DEFAULT_COUNTRY_CODE : null),
    country,
    hemisphere,
    hasCountry,
    hydrated,
    setCountry,
    /** True when user has explicitly chosen (or we treat default as set after prompt). */
    needsPrompt: hydrated && code === null,
  };
}
