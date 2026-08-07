import type { FeatureCollection } from 'geojson';
import type { Route, RouteSource } from '../types.ts';

const SOURCES: readonly RouteSource[] = [
  'club-verified',
  'club-member',
  'third-party',
];

/** Coerce an unknown source to a valid tier — default to the least-trusted. */
function normSource(s: unknown): RouteSource {
  return typeof s === 'string' && (SOURCES as readonly string[]).includes(s)
    ? (s as RouteSource)
    : 'third-party';
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function centroidOf(coords: number[][]): [number, number] {
  const n = coords.length;
  let sx = 0;
  let sy = 0;
  for (const [x, y] of coords) {
    sx += x ?? 0;
    sy += y ?? 0;
  }
  return [sx / n, sy / n];
}

/**
 * Map a GeoJSON FeatureCollection (the on-disk routes.geojson format, openable in
 * any GIS tool) into the app's Route contract. Defensive: routes.geojson is
 * served from a CDN, outside the type system, so one malformed feature must not
 * crash the app — features missing id/name/link, or without a >=2-point
 * LineString, are skipped rather than throwing. Pure — unit tested.
 */
export function featuresToRoutes(fc: FeatureCollection): Route[] {
  const out: Route[] = [];
  for (const f of fc.features ?? []) {
    if (f?.geometry?.type !== 'LineString') continue;
    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const p = (f.properties ?? {}) as Record<string, unknown>;
    if (
      typeof p.id !== 'string' ||
      typeof p.name !== 'string' ||
      typeof p.link !== 'string'
    ) {
      continue;
    }
    out.push({
      id: p.id,
      name: p.name,
      link: p.link,
      distance_km: typeof p.distance_km === 'number' ? p.distance_km : 0,
      source: normSource(p.source),
      region: str(p.region, 'Other'),
      notes: str(p.notes),
      cafe: str(p.cafe),
      route_type: typeof p.route_type === 'string' ? p.route_type : undefined,
      geometry: f.geometry,
      centroid: centroidOf(coords),
    });
  }
  return out;
}

export async function loadRoutes(url = '/routes.geojson'): Promise<Route[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load routes: ${res.status}`);
  return featuresToRoutes((await res.json()) as FeatureCollection);
}
