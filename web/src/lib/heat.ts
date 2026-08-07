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

/**
 * PROTOTYPE: Strava-style red heat, PER THEME. Strava inverts its ramp by
 * basemap so the busiest corridors always have the most contrast: on the light
 * map hot is a DEEP red fading to orange; on the dark map hot is a BRIGHT amber
 * fading to dim red. Ordered faint -> hot within each theme.
 */
type HeatTier = { max: number; weight: number; opacity: number; color: string };

export const HEAT_RAMP: Record<'light' | 'dark', HeatTier[]> = {
  // Light basemap: PURE reds, soft red (quiet) -> deep maroon (busiest =
  // darkest). Deliberately no orange/amber — that collides with Voyager's
  // orange A/B roads, making faint heat look like just another road (Strava
  // sidesteps this with a grey basemap; we keep the green base and drop orange).
  light: [
    { max: 1, weight: 1.3, opacity: 0.55, color: '#f87171' },
    { max: 2, weight: 1.8, opacity: 0.66, color: '#ef4444' },
    { max: 3, weight: 2.3, opacity: 0.76, color: '#dc2626' },
    { max: 5, weight: 2.9, opacity: 0.85, color: '#b91c1c' },
    { max: 8, weight: 3.7, opacity: 0.92, color: '#991b1b' },
    { max: Infinity, weight: 4.5, opacity: 0.98, color: '#7f1d1d' },
  ],
  // Dark basemap: dim red (quiet) -> bright amber (busiest = brightest).
  dark: [
    { max: 1, weight: 1.3, opacity: 0.55, color: '#7f1d1d' },
    { max: 2, weight: 1.8, opacity: 0.66, color: '#b91c1c' },
    { max: 3, weight: 2.3, opacity: 0.76, color: '#ef4444' },
    { max: 5, weight: 2.9, opacity: 0.85, color: '#f97316' },
    { max: 8, weight: 3.7, opacity: 0.92, color: '#ff8a1e' },
    { max: Infinity, weight: 4.5, opacity: 0.99, color: '#ffb020' },
  ],
};

/**
 * Four representative stops (faint -> hot) for the map legend's idle heat swatch.
 * Lives here, beside HEAT_RAMP, so the swatch and the drawn layer share one home
 * and can't quietly diverge (TB-54). The ENDS are the ramp's own endpoints; the
 * middle two are the design spec's chosen gradient. heat.test.ts pins the ends.
 */
export const LEGEND_HEAT_STOPS: Record<
  'light' | 'dark',
  [string, string, string, string]
> = {
  light: ['#f87171', '#dc2626', '#991b1b', '#7f1d1d'],
  dark: ['#7f1d1d', '#ef4444', '#f97316', '#ffb020'],
};

/** Faint tone used while a search is active (heat flattens under the matches). */
export const FLAT_HEAT_RED: Record<
  'light' | 'dark',
  { weight: number; opacity: number; color: string }
> = {
  light: { weight: 1.1, opacity: 0.36, color: '#dc2626' },
  dark: { weight: 1.1, opacity: 0.2, color: '#b91c1c' },
};

/** Which HEAT_RAMP tier a segment with `count` overlapping routes falls into. */
export function heatTierIndex(count: number, theme: 'light' | 'dark'): number {
  const i = HEAT_RAMP[theme].findIndex((t) => count <= t.max);
  return i < 0 ? HEAT_RAMP[theme].length - 1 : i;
}
