/**
 * Merge elevation + owner extracted from a route's GPX into its GeoJSON feature.
 * Pure + unit-tested; the seam the non-Strava enrichment script (and, later, the
 * TB-65 link importers) build on.
 *
 * It rebuilds the geometry from the GPX `<trkpt>`s so elevation rides in as the
 * standard 3rd coordinate (`[lng, lat, ele]`), sets `elevation_gain_m` computed
 * from that series (see elevation.ts for the non-Strava gain rule), and sets the
 * owner only when the GPX carries an `<author>` block. All other properties are
 * copied through untouched, and the input feature is never mutated — so running
 * it twice yields an identical feature.
 */

import type { Feature, LineString } from 'geojson';
import { parseTrackpoints, parseAuthor } from './gpx.ts';
import { elevationGainM, type ElevationGainOptions } from './elevation.ts';

export function enrichFeatureFromGpx(
  feature: Feature<LineString>,
  gpx: string,
  opts: ElevationGainOptions = {}
): Feature<LineString> {
  const coords = parseTrackpoints(gpx);
  if (coords.length < 2) {
    throw new Error(
      `GPX has ${coords.length} trackpoint(s); need at least 2 to build a route`
    );
  }
  // This function's whole job is elevation — a GPX with no <ele> series (e.g. an
  // elevation-stripped export) would otherwise be stored as 2D geometry with 0 m
  // gain and reported as a success. Refuse it loudly instead.
  const eleSamples = coords.filter(
    (c) => typeof c[2] === 'number' && Number.isFinite(c[2])
  ).length;
  if (eleSamples < 2) {
    throw new Error(
      `GPX carries ${eleSamples} elevation sample(s); need an <ele> series to enrich`
    );
  }
  const author = parseAuthor(gpx);

  const properties: Record<string, unknown> = {
    ...(feature.properties ?? {}),
    elevation_gain_m: elevationGainM(coords, opts),
  };
  // Owner only when the source provides it — no fabricated names, and RWGPS/Garmin
  // owners have no Strava id, so that field stays absent for those sources.
  if (author?.name) properties.owner_name = author.name;
  if (author?.stravaId) properties.owner_strava_id = author.stravaId;

  return {
    ...feature,
    properties,
    geometry: { type: 'LineString', coordinates: coords },
  };
}
