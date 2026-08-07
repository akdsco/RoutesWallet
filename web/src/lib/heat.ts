import type { Route } from '../types.ts';

/**
 * Strava-style heat by SEGMENT COUNTING (not stacked alpha). Real GPS traces of the
 * same lane never share coordinates — 5–15 m of scatter, different vertex spacing —
 * so we can't key on raw coordinates or every count comes back 1. Instead:
 *
 *   1. project each coordinate to Web Mercator METRES (raw degrees skew with latitude),
 *   2. snap to a grid cell of `cellMeters`, dropping consecutive duplicate cells,
 *   3. key each consecutive cell pair order-independently (cellA|cellB),
 *   4. count how many ROUTES use each key (deduped within a route so an out-and-back
 *      doesn't count itself twice),
 *   5. draw each unique segment once, styled by count.
 *
 * Coincident corridors read hot; lone lanes stay faint. Pure — unit tested. The cell
 * size is zoom-dependent (see cellSizeForZoom): coarse when zoomed out so parallel
 * lanes merge into corridors, fine when zoomed in so distinct lanes separate.
 */
export type HeatSegment = {
  a: [number, number]; // [lng, lat] of cell-A centre
  b: [number, number]; // [lng, lat] of cell-B centre
  count: number;
};

const EARTH_R = 6378137; // Web Mercator sphere radius (m)

function toMercator(lng: number, lat: number): [number, number] {
  const x = ((lng * Math.PI) / 180) * EARTH_R;
  const clamped = Math.max(-85.06, Math.min(85.06, lat));
  const y =
    Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 180 / 2)) * EARTH_R;
  return [x, y];
}

function cellCentreLngLat(
  cx: number,
  cy: number,
  cellMeters: number
): [number, number] {
  const mx = (cx + 0.5) * cellMeters;
  const my = (cy + 0.5) * cellMeters;
  const lng = ((mx / EARTH_R) * 180) / Math.PI;
  const lat =
    ((2 * Math.atan(Math.exp(my / EARTH_R)) - Math.PI / 2) * 180) / Math.PI;
  return [lng, lat];
}

/** Build the heat index for one grid resolution. */
export function buildHeatIndex(
  routes: Route[],
  cellMeters: number
): HeatSegment[] {
  const counts = new Map<string, number>();
  for (const r of routes) {
    // Snap the route's coordinates to a sequence of distinct cells.
    const cells: string[] = [];
    let prev = '';
    for (const p of r.geometry.coordinates) {
      const [mx, my] = toMercator(p[0] ?? 0, p[1] ?? 0);
      const key = `${Math.floor(mx / cellMeters)}:${Math.floor(my / cellMeters)}`;
      if (key !== prev) {
        cells.push(key);
        prev = key;
      }
    }
    const seen = new Set<string>();
    for (let i = 0; i < cells.length - 1; i++) {
      const a = cells[i]!;
      const b = cells[i + 1]!;
      if (a === b) continue;
      const segKey = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(segKey)) continue; // a route counts each segment once
      seen.add(segKey);
      counts.set(segKey, (counts.get(segKey) ?? 0) + 1);
    }
  }

  const segs: HeatSegment[] = [];
  for (const [segKey, count] of counts) {
    const [ka, kb] = segKey.split('|');
    const [ax, ay] = ka!.split(':').map(Number);
    const [bx, by] = kb!.split(':').map(Number);
    segs.push({
      a: cellCentreLngLat(ax!, ay!, cellMeters),
      b: cellCentreLngLat(bx!, by!, cellMeters),
      count,
    });
  }
  return segs;
}

/** Grid resolution by zoom: coarse (corridors) far out, fine (lanes) zoomed in. */
export function cellSizeForZoom(zoom: number): number {
  if (zoom >= 14) return 25;
  if (zoom >= 11) return 60;
  return 150;
}

export type HeatStyle = { weight: number; opacity: number; color: string };

/**
 * Six overlap tiers. Exported as config, not inline literals — real club data peaks
 * lower than synthetic (~6–10, not ~20), so these thresholds get retuned against it.
 */
export const HEAT_TIERS: {
  max: number;
  weight: number;
  opacity: number;
  color: string;
}[] = [
  { max: 1, weight: 1.0, opacity: 0.11, color: 'var(--heat)' },
  { max: 2, weight: 1.6, opacity: 0.26, color: 'var(--heat)' },
  { max: 3, weight: 2.1, opacity: 0.4, color: 'var(--heat)' },
  { max: 5, weight: 2.8, opacity: 0.56, color: 'var(--match)' },
  { max: 8, weight: 3.6, opacity: 0.74, color: 'var(--match)' },
  { max: Infinity, weight: 4.4, opacity: 0.92, color: 'var(--text)' },
];

/**
 * PROTOTYPE: Strava-style red→amber heat ramp (faint dim-red for a lone lane,
 * bright amber for the hottest corridors). A SINGLE palette for both light and
 * dark, mirroring Strava (which has no theme) — opacity carries most of the
 * faint→hot range so the reds read over both the cream and near-black basemaps.
 * If green-lit, this replaces (or theme-tunes) the ink tiers above.
 */
export const HEAT_RAMP: {
  max: number;
  weight: number;
  opacity: number;
  color: string;
}[] = [
  { max: 1, weight: 1.3, opacity: 0.32, color: '#d11149' },
  { max: 2, weight: 1.8, opacity: 0.44, color: '#e11d3f' },
  { max: 3, weight: 2.3, opacity: 0.56, color: '#f0341f' },
  { max: 5, weight: 2.9, opacity: 0.7, color: '#ff5a1f' },
  { max: 8, weight: 3.7, opacity: 0.85, color: '#ff8a1e' },
  { max: Infinity, weight: 4.5, opacity: 0.97, color: '#ffb020' },
];

/** Faint red used while a search is active (heat flattens under the matches). */
export const FLAT_HEAT_RED = { weight: 1.1, opacity: 0.16, color: '#d11149' };

/** Idle heat style for an overlap count (weight rises, opacity deepens). */
export function heatStyle(count: number): HeatStyle {
  const tier =
    HEAT_TIERS.find((t) => count <= t.max) ??
    HEAT_TIERS[HEAT_TIERS.length - 1]!;
  return { weight: tier.weight, opacity: tier.opacity, color: tier.color };
}

/**
 * While a search is active the heat FLATTENS to a uniform faint layer — tiers off —
 * so its hottest corridors can't out-weigh the matched lines drawn over it.
 */
export const FLAT_HEAT: HeatStyle = {
  weight: 1.1,
  opacity: 0.13,
  color: 'var(--heat)',
};
