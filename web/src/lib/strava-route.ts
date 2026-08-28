import type { Feature, LineString } from 'geojson';
import { decodePolyline } from './polyline.ts';

/**
 * The subset of Strava's route-list payload (`GET /athletes/{id}/routes`) we
 * consume. List-only: geometry comes from `map.summary_polyline`, the numbers
 * straight off the route object — no per-route GPX fetch, so a connect is a
 * couple of API calls regardless of how many routes a member has.
 */
export type StravaRouteInput = {
  id_str: string;
  name: string;
  /** Metres. */
  distance: number;
  /** Metres. */
  elevation_gain: number;
  map?: { summary_polyline?: string | null } | null;
  athlete?: {
    id?: number | null;
    firstname?: string | null;
    lastname?: string | null;
  } | null;
};

export type MemberRouteFeature = Feature<
  LineString,
  Record<string, unknown> & { id: string }
>;

function ownerName(a: StravaRouteInput['athlete']): string | undefined {
  const name = [a?.firstname, a?.lastname]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(' ')
    .trim();
  return name || undefined;
}

/**
 * Transform one Strava route-list entry into a GeoJSON Feature in the on-disk
 * `routes.geojson` shape, so `featuresToRoutes` consumes it unchanged. Stamps the
 * owner and `source: 'club-member'`. `country`/`region` are left `null` here and
 * filled by the normalise step (a separate pass over the decoded line).
 *
 * Returns `null` when the route has no usable line (empty/degenerate polyline) so
 * the caller can skip-and-count rather than pushing a broken feature — an
 * observable degrade, not a silent one.
 */
export function stravaRouteToFeature(
  r: StravaRouteInput
): MemberRouteFeature | null {
  const coordinates = decodePolyline(r.map?.summary_polyline ?? '');
  if (coordinates.length < 2) return null;

  return {
    type: 'Feature',
    properties: {
      id: r.id_str,
      name: r.name,
      link: `https://www.strava.com/routes/${r.id_str}`,
      distance_km: Math.round((r.distance / 1000) * 10) / 10,
      source: 'club-member',
      country: null,
      region: null,
      notes: '',
      cafe: '',
      elevation_gain_m:
        typeof r.elevation_gain === 'number'
          ? Math.round(r.elevation_gain)
          : undefined,
      owner_name: ownerName(r.athlete),
      owner_strava_id: r.athlete?.id != null ? String(r.athlete.id) : undefined,
    },
    geometry: { type: 'LineString', coordinates },
  };
}
