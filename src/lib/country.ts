/** Country → hemisphere + approximate observer helpers for sky personalization. No API keys. */

export type Hemisphere = "north" | "south";

export type CountryOption = {
  code: string;
  name: string;
  /** Approximate: countries mostly south of the equator. */
  hemisphere: Hemisphere;
  /** Approximate capital / population center (°N). */
  lat: number;
  /** Approximate capital / population center (°E; west negative). */
  lon: number;
  /** IANA timezone for a sensible “tonight” clock. */
  timezone: string;
};

/**
 * Curated short list for the country picker.
 * Lat/lon are country approximations (not GPS); good enough for garden-scale alt/az.
 * Do not treat the first entry as the visitor's country until they pick.
 */
export const COUNTRIES: CountryOption[] = [
  { code: "NG", name: "Nigeria", hemisphere: "north", lat: 6.45, lon: 3.4, timezone: "Africa/Lagos" },
  { code: "GH", name: "Ghana", hemisphere: "north", lat: 5.56, lon: -0.2, timezone: "Africa/Accra" },
  { code: "KE", name: "Kenya", hemisphere: "south", lat: -1.29, lon: 36.82, timezone: "Africa/Nairobi" },
  { code: "ZA", name: "South Africa", hemisphere: "south", lat: -26.2, lon: 28.04, timezone: "Africa/Johannesburg" },
  { code: "EG", name: "Egypt", hemisphere: "north", lat: 30.04, lon: 31.24, timezone: "Africa/Cairo" },
  { code: "MA", name: "Morocco", hemisphere: "north", lat: 33.57, lon: -7.59, timezone: "Africa/Casablanca" },
  { code: "GB", name: "United Kingdom", hemisphere: "north", lat: 51.51, lon: -0.13, timezone: "Europe/London" },
  { code: "IE", name: "Ireland", hemisphere: "north", lat: 53.35, lon: -6.26, timezone: "Europe/Dublin" },
  { code: "FR", name: "France", hemisphere: "north", lat: 48.86, lon: 2.35, timezone: "Europe/Paris" },
  { code: "DE", name: "Germany", hemisphere: "north", lat: 52.52, lon: 13.41, timezone: "Europe/Berlin" },
  { code: "NL", name: "Netherlands", hemisphere: "north", lat: 52.37, lon: 4.9, timezone: "Europe/Amsterdam" },
  { code: "ES", name: "Spain", hemisphere: "north", lat: 40.42, lon: -3.7, timezone: "Europe/Madrid" },
  { code: "PT", name: "Portugal", hemisphere: "north", lat: 38.72, lon: -9.14, timezone: "Europe/Lisbon" },
  { code: "IT", name: "Italy", hemisphere: "north", lat: 41.9, lon: 12.5, timezone: "Europe/Rome" },
  { code: "PL", name: "Poland", hemisphere: "north", lat: 52.23, lon: 21.01, timezone: "Europe/Warsaw" },
  { code: "SE", name: "Sweden", hemisphere: "north", lat: 59.33, lon: 18.07, timezone: "Europe/Stockholm" },
  { code: "NO", name: "Norway", hemisphere: "north", lat: 59.91, lon: 10.75, timezone: "Europe/Oslo" },
  { code: "US", name: "United States", hemisphere: "north", lat: 39.83, lon: -98.58, timezone: "America/Chicago" },
  { code: "CA", name: "Canada", hemisphere: "north", lat: 45.42, lon: -75.7, timezone: "America/Toronto" },
  { code: "MX", name: "Mexico", hemisphere: "north", lat: 19.43, lon: -99.13, timezone: "America/Mexico_City" },
  { code: "BR", name: "Brazil", hemisphere: "south", lat: -15.79, lon: -47.88, timezone: "America/Sao_Paulo" },
  { code: "AR", name: "Argentina", hemisphere: "south", lat: -34.6, lon: -58.38, timezone: "America/Argentina/Buenos_Aires" },
  { code: "CL", name: "Chile", hemisphere: "south", lat: -33.45, lon: -70.67, timezone: "America/Santiago" },
  { code: "CO", name: "Colombia", hemisphere: "north", lat: 4.71, lon: -74.07, timezone: "America/Bogota" },
  { code: "PE", name: "Peru", hemisphere: "south", lat: -12.05, lon: -77.04, timezone: "America/Lima" },
  { code: "IN", name: "India", hemisphere: "north", lat: 28.61, lon: 77.21, timezone: "Asia/Kolkata" },
  { code: "PK", name: "Pakistan", hemisphere: "north", lat: 33.68, lon: 73.05, timezone: "Asia/Karachi" },
  { code: "BD", name: "Bangladesh", hemisphere: "north", lat: 23.81, lon: 90.41, timezone: "Asia/Dhaka" },
  { code: "CN", name: "China", hemisphere: "north", lat: 39.9, lon: 116.4, timezone: "Asia/Shanghai" },
  { code: "JP", name: "Japan", hemisphere: "north", lat: 35.68, lon: 139.69, timezone: "Asia/Tokyo" },
  { code: "KR", name: "South Korea", hemisphere: "north", lat: 37.57, lon: 126.98, timezone: "Asia/Seoul" },
  { code: "PH", name: "Philippines", hemisphere: "north", lat: 14.6, lon: 120.98, timezone: "Asia/Manila" },
  { code: "ID", name: "Indonesia", hemisphere: "south", lat: -6.2, lon: 106.85, timezone: "Asia/Jakarta" },
  { code: "MY", name: "Malaysia", hemisphere: "north", lat: 3.14, lon: 101.69, timezone: "Asia/Kuala_Lumpur" },
  { code: "SG", name: "Singapore", hemisphere: "north", lat: 1.35, lon: 103.82, timezone: "Asia/Singapore" },
  { code: "TH", name: "Thailand", hemisphere: "north", lat: 13.76, lon: 100.5, timezone: "Asia/Bangkok" },
  { code: "VN", name: "Vietnam", hemisphere: "north", lat: 21.03, lon: 105.85, timezone: "Asia/Ho_Chi_Minh" },
  { code: "AU", name: "Australia", hemisphere: "south", lat: -35.28, lon: 149.13, timezone: "Australia/Sydney" },
  { code: "NZ", name: "New Zealand", hemisphere: "south", lat: -41.29, lon: 174.78, timezone: "Pacific/Auckland" },
  { code: "AE", name: "United Arab Emirates", hemisphere: "north", lat: 25.2, lon: 55.27, timezone: "Asia/Dubai" },
  { code: "SA", name: "Saudi Arabia", hemisphere: "north", lat: 24.71, lon: 46.68, timezone: "Asia/Riyadh" },
  { code: "TR", name: "Türkiye", hemisphere: "north", lat: 39.93, lon: 32.86, timezone: "Europe/Istanbul" },
  { code: "RU", name: "Russia", hemisphere: "north", lat: 55.76, lon: 37.62, timezone: "Europe/Moscow" },
  { code: "UA", name: "Ukraine", hemisphere: "north", lat: 50.45, lon: 30.52, timezone: "Europe/Kyiv" },
];

export const COUNTRY_STORAGE_KEY = "qw-country";

/**
 * Library / API fallback for *invalid* codes only — not an assumed visitor country.
 * UI must not treat an unset `qw-country` as NG.
 */
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

/**
 * Instant that is approximately `hourLocal`:00 on the civil date in `timezone`
 * that matches “today” for that zone (defaults to ~21:00 evening sky).
 */
export function tonightLocalDate(
  timezone: string,
  hourLocal = 21,
  ref: Date = new Date(),
): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ref);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  // Guess UTC, then correct using the zone’s offset at that guess.
  let utc = Date.UTC(year, month - 1, day, hourLocal, 0, 0);
  for (let i = 0; i < 3; i++) {
    const asLocal = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utc));
    const g = (type: string) => Number(asLocal.find((p) => p.type === type)?.value ?? "0");
    const localHour = g("hour") === 24 ? 0 : g("hour");
    const want = Date.UTC(year, month - 1, day, hourLocal, 0, 0);
    const got = Date.UTC(g("year"), g("month") - 1, g("day"), localHour, g("minute"), 0);
    utc += want - got;
  }
  return new Date(utc);
}
