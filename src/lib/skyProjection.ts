/**
 * Client-side alt/az projection for catalog stars via astronomy-engine.
 * Approximate country lat/lon + ~21:00 local — honest garden precision, not surveying.
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
  getCountryByCode,
  tonightLocalDate,
  type CountryOption,
  type Hemisphere,
} from "@/lib/country";
import { constellations as FALLBACK, type Constellation, type StarPoint } from "@/content/games";

/** Minimum altitude (°) to treat a star as playable / visible. */
export const MIN_ALT_DEG = 10;

export type ProjectedSkyStar = {
  catalogId: string;
  az: number;
  alt: number;
  mag: number;
  name?: string;
};

export type TonightPuzzle = Constellation & {
  /** Whether this came from live projection (vs stylized fallback). */
  projected: boolean;
  closeLoop?: boolean;
  /** Faint field stars in the same viewBox (for finish morph). */
  fieldStars: { x: number; y: number; r: number }[];
  observerNote: string;
  whenLabel: string;
};

export type SkySession = {
  puzzles: TonightPuzzle[];
  country: CountryOption;
  when: Date;
  usedFallback: boolean;
};

function normalizeAzDelta(delta: number): number {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function meanAzimuth(azs: number[]): number {
  if (azs.length === 0) return 0;
  let sx = 0;
  let sy = 0;
  for (const az of azs) {
    const r = (az * Math.PI) / 180;
    sx += Math.sin(r);
    sy += Math.cos(r);
  }
  const ang = (Math.atan2(sx, sy) * 180) / Math.PI;
  return (ang + 360) % 360;
}

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

type ViewFit = {
  centerAz: number;
  minRelAz: number;
  maxRelAz: number;
  minAlt: number;
  maxAlt: number;
};

function fitView(stars: ProjectedSkyStar[]): ViewFit | null {
  const visible = stars.filter((s) => s.alt >= MIN_ALT_DEG);
  if (visible.length < 2) return null;
  const centerAz = meanAzimuth(visible.map((s) => s.az));
  const rel = visible.map((s) => normalizeAzDelta(s.az - centerAz));
  const alts = visible.map((s) => s.alt);
  return {
    centerAz,
    minRelAz: Math.min(...rel),
    maxRelAz: Math.max(...rel),
    minAlt: Math.min(...alts),
    maxAlt: Math.max(...alts),
  };
}

function toViewBox(
  star: ProjectedSkyStar,
  fit: ViewFit,
  /** Extra bottom room so stars sit above the caption overlay on the board. */
  pad: { x?: number; top?: number; bottom?: number } | number = 12,
): { x: number; y: number } {
  const padX = typeof pad === "number" ? pad : (pad.x ?? 12);
  const padTop = typeof pad === "number" ? pad : (pad.top ?? 12);
  const padBottom = typeof pad === "number" ? pad : (pad.bottom ?? 28);
  const relAz = normalizeAzDelta(star.az - fit.centerAz);
  const azSpan = Math.max(8, fit.maxRelAz - fit.minRelAz);
  const altSpan = Math.max(8, fit.maxAlt - fit.minAlt);
  const usableW = 100 - padX * 2;
  const usableH = 100 - padTop - padBottom;
  // Looking "into" the sky: +az (east of center) → right; higher alt → higher on board (lower y)
  const x = padX + ((relAz - fit.minRelAz) / azSpan) * usableW;
  const y = padTop + (1 - (star.alt - fit.minAlt) / altSpan) * usableH;
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

function scoreConstellation(
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
  // Prefer compact, high patterns
  return frac * 40 + meanAlt * 0.6 + bonus - (def.path.length > 6 ? 2 : 0);
}

function buildPuzzle(
  def: CatalogConstellation,
  pathProjected: ProjectedSkyStar[],
  fieldProjected: ProjectedSkyStar[],
  country: CountryOption,
  when: Date,
  minAlt = MIN_ALT_DEG,
): TonightPuzzle | null {
  const usable = pathProjected.filter((s) => s.alt >= minAlt);
  if (usable.length < Math.min(3, def.path.length)) return null;

  // Keep path order; skip constellation if any path star is below the clip
  const ordered: ProjectedSkyStar[] = [];
  for (const id of def.path) {
    const p = pathProjected.find((s) => s.catalogId === id);
    if (!p || p.alt < minAlt) {
      return null;
    }
    ordered.push(p);
  }

  const fit = fitView(ordered);
  if (!fit) return null;

  // Expand fit slightly so field stars near the pattern can land in-frame
  const paddedFit: ViewFit = {
    ...fit,
    minRelAz: fit.minRelAz - 4,
    maxRelAz: fit.maxRelAz + 4,
    minAlt: Math.max(minAlt, fit.minAlt - 4),
    maxAlt: Math.min(90, fit.maxAlt + 6),
  };

  // Keep playable stars above the floating caption (~bottom 25% of the board).
  const boardPad = { x: 12, top: 12, bottom: 28 };

  const stars: StarPoint[] = ordered.map((s, i) => {
    const { x, y } = toViewBox(s, paddedFit, boardPad);
    return {
      id: i + 1,
      x,
      y,
      label: s.name,
    };
  });

  const fieldStars = fieldProjected
    .filter((s) => s.alt >= MIN_ALT_DEG)
    .filter((s) => !def.path.includes(s.catalogId))
    .map((s) => {
      const { x, y } = toViewBox(s, paddedFit, boardPad);
      const r = s.mag < 0.5 ? 0.7 : s.mag < 1.5 ? 0.5 : 0.35;
      return { x, y, r };
    })
    .filter((s) => s.x >= 2 && s.x <= 98 && s.y >= 2 && s.y <= 98)
    .slice(0, 48);

  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: country.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(when);

  return {
    id: def.id,
    name: def.name,
    hint: def.hint,
    fact: def.fact,
    stars,
    projected: true,
    closeLoop: def.closeLoop,
    fieldStars,
    observerNote: `Approx. ${country.name} (${country.lat.toFixed(1)}°, ${country.lon.toFixed(1)}°)`,
    whenLabel: `~${hour} local`,
  };
}

function fallbackSession(country: CountryOption): SkySession {
  const puzzles: TonightPuzzle[] = FALLBACK.map((c) => ({
    ...c,
    // Keep classic charts above the caption strip (same band as live projection).
    stars: c.stars.map((s) => ({
      ...s,
      y: Math.round((8 + (s.y / 100) * 64) * 10) / 10,
    })),
    projected: false,
    fieldStars: [
      { x: 8, y: 12, r: 0.4 },
      { x: 90, y: 18, r: 0.35 },
      { x: 12, y: 88, r: 0.4 },
      { x: 94, y: 78, r: 0.35 },
      { x: 55, y: 12, r: 0.3 },
      { x: 40, y: 90, r: 0.35 },
      { x: 70, y: 55, r: 0.3 },
      { x: 25, y: 40, r: 0.35 },
    ],
    observerNote: `${country.name} · stylized chart (projection unavailable)`,
    whenLabel: "classic outline",
  }));
  return { puzzles, country, when: new Date(), usedFallback: true };
}

/**
 * Build tonight’s playable constellation puzzles for a country code.
 * Prefers patterns actually above ~10° altitude at ~21:00 local.
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

    // Pre-project every catalog star once
    const projectedAll: ProjectedSkyStar[] = [];
    for (const star of ALL_STARS) {
      const p = projectCatalogStar(star.id, when, observer);
      if (p) projectedAll.push(p);
    }
    if (projectedAll.length < 5) return fallbackSession(country);

    const byId = new Map(projectedAll.map((s) => [s.catalogId, s]));

    type Scored = { def: CatalogConstellation; score: number; path: ProjectedSkyStar[] };
    const scored: Scored[] = [];
    for (const def of CATALOG_CONSTELLATIONS) {
      const path = def.path
        .map((id) => byId.get(id))
        .filter((s): s is ProjectedSkyStar => Boolean(s));
      if (path.length !== def.path.length) continue;
      const score = scoreConstellation(def, path, tonightNames);
      if (score >= 0) scored.push({ def, score, path });
    }

    scored.sort((a, b) => b.score - a.score);

    const puzzles: TonightPuzzle[] = [];
    for (const item of scored) {
      const puzzle = buildPuzzle(item.def, item.path, projectedAll, country, when);
      if (puzzle) puzzles.push(puzzle);
      if (puzzles.length >= 3) break;
    }

    if (puzzles.length === 0) {
      // Soft fallback: pick the highest mean-alt constellation even if sparse
      let best: { def: CatalogConstellation; path: ProjectedSkyStar[]; mean: number } | null =
        null;
      for (const def of CATALOG_CONSTELLATIONS) {
        const path = def.path
          .map((id) => byId.get(id))
          .filter((s): s is ProjectedSkyStar => s != null && s.alt >= 5);
        if (path.length < Math.min(3, def.path.length)) continue;
        // Use only visible stars, re-path by original order among visible
        const visibleOrdered = def.path
          .map((id) => byId.get(id))
          .filter((s): s is ProjectedSkyStar => s != null && s.alt >= 5);
        if (visibleOrdered.length < 3) continue;
        const mean =
          visibleOrdered.reduce((a, s) => a + s.alt, 0) / visibleOrdered.length;
        if (!best || mean > best.mean) best = { def, path: visibleOrdered, mean };
      }
      if (best) {
        // Temporarily rewrite path to visible-only for soft fallback
        const softDef = { ...best.def, path: best.path.map((s) => s.catalogId) };
        const puzzle = buildPuzzle(softDef, best.path, projectedAll, country, when, 5);
        if (puzzle) {
          puzzle.hint = `${puzzle.hint} (soft pick — some stars skim the horizon.)`;
          puzzles.push(puzzle);
        }
      }
    }

    if (puzzles.length === 0) return fallbackSession(country);

    return { puzzles, country, when, usedFallback: false };
  } catch {
    return fallbackSession(country);
  }
}
