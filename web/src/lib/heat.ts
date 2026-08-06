import type { Route } from '../types.ts';

/**
 * Strava-style heat: split every route into segments, count how many routes share
 * each segment, then draw each unique segment once, styled by that count. Coincident
 * corridors read hot; lone lanes stay faint. Pure — unit tested. No leaflet.heat.
 *
 * Segments are keyed by their rounded endpoints (order-independent), so two routes
 * tracing the same road stack into one hotter segment. At ~6 scattered routes this
 * mostly yields count 1 (faint); it blooms as the local library grows.
 */
export type HeatSegment = {
  a: [number, number]; // [lng, lat]
  b: [number, number];
  count: number;
};

/** 5-decimal (~1 m) rounding, order-independent so A→B and B→A collapse. */
function segKey(a: number[], b: number[]): string {
  const ax = (a[0] ?? 0).toFixed(5);
  const ay = (a[1] ?? 0).toFixed(5);
  const bx = (b[0] ?? 0).toFixed(5);
  const by = (b[1] ?? 0).toFixed(5);
  const p = `${ax},${ay}`;
  const q = `${bx},${by}`;
  return p < q ? `${p}|${q}` : `${q}|${p}`;
}

export function heatSegments(routes: Route[]): HeatSegment[] {
  const segs = new Map<string, HeatSegment>();
  for (const r of routes) {
    const c = r.geometry.coordinates;
    const seenInRoute = new Set<string>();
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i]!;
      const b = c[i + 1]!;
      const k = segKey(a, b);
      if (seenInRoute.has(k)) continue; // a route only counts a segment once
      seenInRoute.add(k);
      const existing = segs.get(k);
      if (existing) {
        existing.count += 1;
      } else {
        segs.set(k, {
          a: [a[0] ?? 0, a[1] ?? 0],
          b: [b[0] ?? 0, b[1] ?? 0],
          count: 1,
        });
      }
    }
  }
  return [...segs.values()];
}

export type HeatStyle = { weight: number; opacity: number; color: string };

const TIERS: { max: number; weight: number; opacity: number; color: string }[] =
  [
    { max: 1, weight: 1.0, opacity: 0.11, color: 'var(--heat)' },
    { max: 2, weight: 1.6, opacity: 0.26, color: 'var(--heat)' },
    { max: 3, weight: 2.1, opacity: 0.4, color: 'var(--heat)' },
    { max: 5, weight: 2.8, opacity: 0.56, color: 'var(--match)' },
    { max: 8, weight: 3.6, opacity: 0.74, color: 'var(--match)' },
    { max: Infinity, weight: 4.4, opacity: 0.92, color: 'var(--text)' },
  ];

/** Map an overlap count to its stroke style (weight rises, opacity deepens). */
export function heatStyle(count: number): HeatStyle {
  const tier = TIERS.find((t) => count <= t.max) ?? TIERS[TIERS.length - 1]!;
  return { weight: tier.weight, opacity: tier.opacity, color: tier.color };
}
