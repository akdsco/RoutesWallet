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
  /**
   * Top-level grouping key, e.g. "United Kingdom", "Spain". A country "unlocks"
   * region (county) selection; only UK routes carry a region today. `null` when
   * the country couldn't be resolved (a few ambiguous personal routes).
   */
  country: string | null;
  /**
   * Second-level grouping + card meta: the UK ceremonial county, a canonical full
   * name from `lib/region.ts` (e.g. "Kent", "Hertfordshire", "Greater London").
   * Explicit `null` = no county set (overseas, or not yet resolved) — never "".
   */
  region: string | null;
  /** Free-text ride notes shown on the selected card. May be empty. */
  notes: string;
  /** Café stop, shown on the selected card when present. May be empty. */
  cafe: string;
  /** Optional, from the GPX import (e.g. "Road"). Not surfaced yet. */
  route_type?: string;
  /**
   * Total elevation gain in metres — Strava's own displayed figure, not a local
   * recomputation. Optional: absent on routes we couldn't enrich (e.g. the few
   * non-Strava links). Not surfaced yet.
   */
  elevation_gain_m?: number;
  /** Route owner's display name, from the GPX author metadata. Optional. */
  owner_name?: string;
  /** Route owner's Strava athlete id, for a profile link. Optional. */
  owner_strava_id?: string;
  /**
   * `[lng, lat]` pairs, optionally `[lng, lat, ele]` where elevation was imported
   * (the standard GeoJSON 3rd coordinate). The profile chart reads the 3rd axis.
   */
  geometry: LineString;
  /** [lng, lat], for a cheap proximity pre-filter before the exact line distance. */
  centroid: [number, number];
};
