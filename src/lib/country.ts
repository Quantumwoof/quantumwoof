/** Country → hemisphere helpers for sky personalization. No API keys. */

export type Hemisphere = "north" | "south";

export type CountryOption = {
  code: string;
  name: string;
  /** Approximate: countries mostly south of the equator. */
  hemisphere: Hemisphere;
};

/**
 * Curated short list — Lagos-friendly default when unset.
 * Enough for the garden; not a full ISO catalog.
 */
export const COUNTRIES: CountryOption[] = [
  { code: "NG", name: "Nigeria", hemisphere: "north" },
  { code: "GH", name: "Ghana", hemisphere: "north" },
  { code: "KE", name: "Kenya", hemisphere: "south" },
  { code: "ZA", name: "South Africa", hemisphere: "south" },
  { code: "EG", name: "Egypt", hemisphere: "north" },
  { code: "MA", name: "Morocco", hemisphere: "north" },
  { code: "GB", name: "United Kingdom", hemisphere: "north" },
  { code: "IE", name: "Ireland", hemisphere: "north" },
  { code: "FR", name: "France", hemisphere: "north" },
  { code: "DE", name: "Germany", hemisphere: "north" },
  { code: "NL", name: "Netherlands", hemisphere: "north" },
  { code: "ES", name: "Spain", hemisphere: "north" },
  { code: "PT", name: "Portugal", hemisphere: "north" },
  { code: "IT", name: "Italy", hemisphere: "north" },
  { code: "PL", name: "Poland", hemisphere: "north" },
  { code: "SE", name: "Sweden", hemisphere: "north" },
  { code: "NO", name: "Norway", hemisphere: "north" },
  { code: "US", name: "United States", hemisphere: "north" },
  { code: "CA", name: "Canada", hemisphere: "north" },
  { code: "MX", name: "Mexico", hemisphere: "north" },
  { code: "BR", name: "Brazil", hemisphere: "south" },
  { code: "AR", name: "Argentina", hemisphere: "south" },
  { code: "CL", name: "Chile", hemisphere: "south" },
  { code: "CO", name: "Colombia", hemisphere: "north" },
  { code: "PE", name: "Peru", hemisphere: "south" },
  { code: "IN", name: "India", hemisphere: "north" },
  { code: "PK", name: "Pakistan", hemisphere: "north" },
  { code: "BD", name: "Bangladesh", hemisphere: "north" },
  { code: "CN", name: "China", hemisphere: "north" },
  { code: "JP", name: "Japan", hemisphere: "north" },
  { code: "KR", name: "South Korea", hemisphere: "north" },
  { code: "PH", name: "Philippines", hemisphere: "north" },
  { code: "ID", name: "Indonesia", hemisphere: "south" },
  { code: "MY", name: "Malaysia", hemisphere: "north" },
  { code: "SG", name: "Singapore", hemisphere: "north" },
  { code: "TH", name: "Thailand", hemisphere: "north" },
  { code: "VN", name: "Vietnam", hemisphere: "north" },
  { code: "AU", name: "Australia", hemisphere: "south" },
  { code: "NZ", name: "New Zealand", hemisphere: "south" },
  { code: "AE", name: "United Arab Emirates", hemisphere: "north" },
  { code: "SA", name: "Saudi Arabia", hemisphere: "north" },
  { code: "TR", name: "Türkiye", hemisphere: "north" },
  { code: "RU", name: "Russia", hemisphere: "north" },
  { code: "UA", name: "Ukraine", hemisphere: "north" },
];

export const COUNTRY_STORAGE_KEY = "qw-country";

/** Default: northern tropics / Lagos-friendly when unknown. */
export const DEFAULT_COUNTRY_CODE = "NG";

export function getCountryByCode(code: string | null | undefined): CountryOption {
  const found = COUNTRIES.find((c) => c.code === code);
  return found ?? COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE)!;
}

export function hemisphereForCountry(code: string | null | undefined): Hemisphere {
  return getCountryByCode(code).hemisphere;
}

export function readStoredCountryCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
    if (!raw) return null;
    if (COUNTRIES.some((c) => c.code === raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredCountryCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COUNTRY_STORAGE_KEY, code);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Day-of-year 1–366 for seasonal sky picks. */
export function dayOfYear(date: Date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start) / 86_400_000);
}
