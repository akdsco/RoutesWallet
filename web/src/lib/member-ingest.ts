import type { FeatureCollection } from 'geojson';
import { stravaRouteToFeature, type StravaRouteInput } from './strava-route.ts';
import { normaliseFeatures, type Lookups } from './normalise.ts';

export type IngestResult = {
  /** The member's routes as normalised Features (country/region filled in). */
  fc: FeatureCollection;
  /** How many routes produced a usable feature. */
  ingested: number;
  /** How many were skipped for having no usable line (observable, not silent). */
  skipped: number;
};

/**
 * Turn a member's Strava route list into normalised `routes.geojson` Features:
 *
 *  1. transform each list entry (list-only geometry from the summary polyline),
 *  2. drop the ones with no usable line — counted in `skipped`, never silently,
 *  3. fill `country` + `region` by the SAME majority-vote normalise the offline
 *     build uses (`normaliseFeatures`), so member routes group and filter exactly
 *     like the seeded club routes.
 *
 * Pure given the injected `lookups` — unit tested with fakes. The Cloudflare
 * Function supplies real lookups built (via `makePointLookup`) over the bundled
 * county + world-country boundary assets.
 */
export function ingestMemberRoutes(
  routes: readonly StravaRouteInput[],
  lookups: Lookups
): IngestResult {
  const features: FeatureCollection['features'] = [];
  let skipped = 0;
  for (const r of routes) {
    const f = stravaRouteToFeature(r);
    if (!f) {
      skipped += 1;
      continue;
    }
    features.push(f);
  }
  const { fc } = normaliseFeatures(
    { type: 'FeatureCollection', features },
    lookups
  );
  return { fc, ingested: features.length, skipped };
}
