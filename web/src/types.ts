import type { LineString } from 'geojson';

/**
 * The route data contract. Backed by one static `routes.geojson` — no database,
 * no server. The map, the search, and routes.geojson all depend on this shape.
 */

/**
 * Trust tier — deliberately club-agnostic so this ports to any club instance:
 * - club-verified: vetted/signed by the club (highest trust)
 * - club-member:   shared by a club member, not formally verified
 * - third-party:   sourced from outside the club
 */
export type RouteSource = 'club-verified' | 'club-member' | 'third-party';

export type Route = {
  id: string;
  name: string;
  /** Opens in Strava/RideWithGPS or downloads a GPX. The exit doesn't change. */
  link: string;
  distance_km: number;
  /** Trust badge. 'HV-signed' = vetted by the club; '3rd-party' = seeded/public. */
  source: RouteSource;
  /** Grouping + card meta, e.g. "Kent", "Essex", "Hub Velo trips". */
  region: string;
  /** Free-text ride notes shown on the selected card. May be empty. */
  notes: string;
  /** Café stop, shown on the selected card when present. May be empty. */
  cafe: string;
  /** Optional, from the GPX import (e.g. "Road"). Not surfaced yet. */
  route_type?: string;
  /** [lng, lat] pairs. */
  geometry: LineString;
  /** [lng, lat], for a cheap proximity pre-filter before the exact line distance. */
  centroid: [number, number];
};
