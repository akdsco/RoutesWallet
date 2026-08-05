import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { Route, RouteSource } from '../types.ts';

type RouteProps = {
  id: string;
  name: string;
  link: string;
  distance_km: number;
  source: RouteSource;
};

function centroidOf(coords: number[][]): [number, number] {
  const n = coords.length;
  const sum = coords.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sum[0] / n, sum[1] / n];
}

/**
 * Map a GeoJSON FeatureCollection (the on-disk routes.geojson format, openable in
 * any GIS tool) into the app's Route contract. Pure — unit tested.
 */
export function featuresToRoutes(fc: FeatureCollection): Route[] {
  return fc.features
    .filter(
      (f): f is Feature<LineString, RouteProps> =>
        f.geometry?.type === 'LineString'
    )
    .map((f) => ({
      id: f.properties.id,
      name: f.properties.name,
      link: f.properties.link,
      distance_km: f.properties.distance_km,
      source: f.properties.source,
      geometry: f.geometry,
      centroid: centroidOf(f.geometry.coordinates),
    }));
}

export async function loadRoutes(url = '/routes.geojson'): Promise<Route[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load routes: ${res.status}`);
  return featuresToRoutes((await res.json()) as FeatureCollection);
}
