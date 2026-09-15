/**
 * Tonight’s few: use astronomy-engine alt/az ONLY to decide which constellation
 * IDs are up / ranked for the observer’s country. Playable layouts come from
 * curated stylized graphs (classic Orion-as-Orion shapes) — never live projection.
 */

import { Horizon, Observer } from "astronomy-engine";
import {
  CATALOG_CONSTELLATIONS,
  STARS,
  ALL_STARS,
  type CatalogConstellation,
} from "@/content/skyCatalog";
import { getTonightStars } from "@/content/tonightStars";
import {
  STYLIZED_CONSTELLATIONS,
  getStylizedById,
  stylizedFieldStars,
  type Constellation,
  type StarPoint,
} from "@/content/games";
import {
  getCountryByCode,
  tonightLocalDate,
  type CountryOption,
  type Hemisphere,
} from "@/lib/country";

/** Minimum altitude (°) to treat a path star as “up”. */
export const MIN_ALT_DEG = 10;

/** Cap tonight’s shortlist (locked UX: about 3–5). */
export const TONIGHT_FEW_MAX = 5;
export const TONIGHT_FEW_MIN = 3;

export type ProjectedSkyStar = {
  catalogId: string;
  az: number;
  alt: number;
  mag: number;
  name?: string;
};

export type TonightPuzzle = Constellation & {
  /**
   * True when this ID was ranked from live visibility for the country.
   * Layout is always stylized — never alt/az playable coords.
   */
  fromSky: boolean;
  closeLoop?: boolean;
  fieldStars: { x: number; y: number; r: number }[];
  observerNote: string;
  whenLabel: string;
  /** Shown on picker when fromSky */
  upTonight?: boolean;
};

export type SkySession = {
  puzzles: TonightPuzzle[];
  country: CountryOption;
  when: Date;
  /** True when we fell back to a small classic seasonal set (none / too few visible). */
  usedFallback: boolean;
  fallbackReason?: string;
};

function projectStar(
  ra: number,
  dec: number,
  when: Date,
  observer: Observer,
): { az: number; alt: number } | null {
  try {
    const hor = Horizon(when, observer, ra, dec, "normal");
    if (!Number.isFinite(hor.altitude) || !Number.isFinite(hor.azimuth)) return null;
    return { az: hor.azimuth, alt: hor.altitude };
  } catch {
    return null;
  }
}

function projectCatalogStar(
  id: string,
  when: Date,
  observer: Observer,
): ProjectedSkyStar | null {
  const star = STARS[id];
  if (!star) return null;
  const hor = projectStar(star.ra, star.dec, when, observer);
  if (!hor) return null;
  return {
    catalogId: id,
    az: hor.az,
    alt: hor.alt,
    mag: star.mag,
    name: star.name,
  };
}

function scoreVisibility(
  def: CatalogConstellation,
  projected: ProjectedSkyStar[],
  tonightNames: Set<string>,
): number {
  const above = projected.filter((s) => s.alt >= MIN_ALT_DEG);
  if (above.length < Math.min(3, def.path.length)) return -1;
  const frac = above.length / def.path.length;
  if (frac < 0.7) return -1;
  const meanAlt = above.reduce((a, s) => a + s.alt, 0) / above.length;
  let bonus = 0;
  for (const alias of def.tonightAliases ?? []) {
    if (tonightNames.has(alias.toLowerCase())) bonus += 8;
  }
  return frac * 40 + meanAlt * 0.6 + bonus - (def.path.length > 6 ? 2 : 0);
}

function toTonightPuzzle(
  stylized: Constellation,
  opts: {
    country: CountryOption;
    when: Date;
    fromSky: boolean;
    whenLabel: string;
    observerNote: string;
  },
): TonightPuzzle {
  // Keep classic charts above the caption strip (~bottom 28%).
  const stars: StarPoint[] = stylized.stars.map((s) => ({
    ...s,
    y: Math.min(68, s.y),
  }));

  return {
    ...stylized,
    stars,
    fromSky: opts.fromSky,
    closeLoop: stylized.closeLoop,
    fieldStars: stylizedFieldStars(stylized.id),
    observerNote: opts.observerNote,
    whenLabel: opts.whenLabel,
    upTonight: opts.fromSky,
  };
}

/** Small classic seasonal set when the sky shortlist is empty. */
function seasonalClassicIds(hemisphere: Hemisphere, ref: Date): string[] {
  const tips = getTonightStars(hemisphere, ref);
  const byAlias = new Map<string, string>();
  for (const def of CATALOG_CONSTELLATIONS) {
    for (const a of def.tonightAliases ?? [def.name]) {
      byAlias.set(a.toLowerCase(), def.id);
    }
  }
  const ids: string[] = [];
  for (const tip of tips) {
    const id = byAlias.get(tip.name.toLowerCase());
    if (id && getStylizedById(id) && !ids.includes(id)) ids.push(id);
    if (ids.length >= TONIGHT_FEW_MIN) break;
  }
  // Guarantee a friendly classic trio if tips didn't map
  const northDefaults = ["orion", "cassiopeia", "ursa-minor", "summer-triangle", "leo"];
  const southDefaults = ["crux", "orion", "canis-major", "scorpius", "sagittarius"];
  const defaults = hemisphere === "south" ? southDefaults : northDefaults;
  for (const id of defaults) {
    if (!ids.includes(id) && getStylizedById(id)) ids.push(id);
    if (ids.length >= TONIGHT_FEW_MIN) break;
  }
  return ids.slice(0, TONIGHT_FEW_MAX);
}

function fallbackSession(
  country: CountryOption,
  hemisphere: Hemisphere,
  when: Date,
  reason: string,
): SkySession {
  const ids = seasonalClassicIds(hemisphere, when);
  const puzzles = ids
    .map((id) => getStylizedById(id))
    .filter((c): c is Constellation => Boolean(c))
    .map((c) =>
      toTonightPuzzle(c, {
        country,
        when,
        fromSky: false,
        whenLabel: "classic seasonal set",
        observerNote: `${country.name} · ${reason}`,
      }),
    );
  return {
    puzzles,
    country,
    when,
    usedFallback: true,
    fallbackReason: reason,
  };
}

/**
 * Build tonight’s shortlist (≈3–5) for a country.
 * Visibility ranking uses lat/lon + ~21:00 local; playable coords are stylized.
 */
export function buildTonightSkySession(
  countryCode: string | null | undefined,
  hemisphere: Hemisphere,
  ref: Date = new Date(),
): SkySession {
  const country = getCountryByCode(countryCode);
  try {
    const when = tonightLocalDate(country.timezone, 21, ref);
    const observer = new Observer(country.lat, country.lon, 50);
    const tonightNames = new Set(
      getTonightStars(hemisphere, ref).map((e) => e.name.toLowerCase()),
    );

    const hour = new Intl.DateTimeFormat("en-GB", {
      timeZone: country.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(when);

    const projectedAll: ProjectedSkyStar[] = [];
    for (const star of ALL_STARS) {
      const p = projectCatalogStar(star.id, when, observer);
      if (p) projectedAll.push(p);
    }
    if (projectedAll.length < 5) {
      return fallbackSession(
        country,
        hemisphere,
        when,
        "Projection thin — classic seasonal shapes instead",
      );
    }

    const byId = new Map(projectedAll.map((s) => [s.catalogId, s]));

    type Scored = { def: CatalogConstellation; score: number };
    const scored: Scored[] = [];
    for (const def of CATALOG_CONSTELLATIONS) {
      if (!getStylizedById(def.id)) continue;
      const path = def.path
        .map((id) => byId.get(id))
        .filter((s): s is ProjectedSkyStar => Boolean(s));
      if (path.length !== def.path.length) continue;
      // Require every path star above the clip for a clean “up tonight”
      if (path.some((s) => s.alt < MIN_ALT_DEG)) continue;
      const score = scoreVisibility(def, path, tonightNames);
      if (score >= 0) scored.push({ def, score });
    }

    scored.sort((a, b) => b.score - a.score);

    const picked = scored.slice(0, TONIGHT_FEW_MAX);
    if (picked.length === 0) {
      return fallbackSession(
        country,
        hemisphere,
        when,
        "Nothing clear above the horizon — classic seasonal shapes instead",
      );
    }

    const puzzles: TonightPuzzle[] = picked.map(({ def }) => {
      const stylized = getStylizedById(def.id)!;
      return toTonightPuzzle(stylized, {
        country,
        when,
        fromSky: true,
        whenLabel: `~${hour} local`,
        observerNote: `Approx. ${country.name} (${country.lat.toFixed(1)}°, ${country.lon.toFixed(1)}°)`,
      });
    });

    return {
      puzzles,
      country,
      when,
      usedFallback: false,
    };
  } catch {
    const countrySafe = getCountryByCode(countryCode);
    return fallbackSession(
      countrySafe,
      hemisphere,
      ref,
      "Sky helper hiccup — classic seasonal shapes instead",
    );
  }
}

/** Expose stylized catalog size for tooling / sanity checks. */
export function listStylizedIds(): string[] {
  return STYLIZED_CONSTELLATIONS.map((c) => c.id);
}


/** Shared home↔play shortlist: same constellation names as Connect’s tonight’s few. */
export type TonightShortlistItem = {
  id: string;
  name: string;
  tip: string;
  fromSky: boolean;
};

export function getTonightShortlist(
  countryCode: string | null | undefined,
  hemisphere: Hemisphere,
  ref: Date = new Date(),
): TonightShortlistItem[] {
  const session = buildTonightSkySession(countryCode, hemisphere, ref);
  const tips = getTonightStars(hemisphere, ref);
  return session.puzzles.map((pz) => {
    const hit = tips.find(
      (e) =>
        e.name.toLowerCase() === pz.name.toLowerCase() ||
        pz.name.toLowerCase().includes(e.name.toLowerCase()) ||
        e.name.toLowerCase().includes(pz.name.toLowerCase().split(" ")[0] ?? ""),
    );
    return {
      id: pz.id,
      name: pz.name,
      tip: hit?.tip ?? pz.shapeNote ?? pz.fact,
      fromSky: pz.fromSky,
    };
  });
}
