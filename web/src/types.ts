import type { LineString } from 'geojson';

/**
 * The frozen route data contract (see root CLAUDE.md). Do not change this shape
 * without the user's say-so — the map, the search, and routes.geojson all depend
 * on it.
 */
export type RouteSource = 'HV-signed' | '3rd-party';

export type Route = {
  id: string;
  name: string;
  /** Opens in Strava/RideWithGPS or downloads a GPX. The exit doesn't change. */
  link: string;
  distance_km: number;
  /** Trust badge. 'HV-signed' = vetted by the club; '3rd-party' = seeded/public. */
  source: RouteSource;
  /** [lng, lat] pairs. */
  geometry: LineString;
  /** [lng, lat], for a cheap proximity pre-filter before the exact line distance. */
  centroid: [number, number];
};
