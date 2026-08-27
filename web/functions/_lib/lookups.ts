import { makePointLookup } from '../../src/lib/county-lookup.ts';
import type { Lookups } from '../../src/lib/normalise.ts';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import countiesJson from '../assets/uk-counties.json';

// cast-ok: uk-counties.json is an opaque bundled asset — TS infers only a giant
// structural literal for it that can't be aligned with the geojson polygon types
// without this double cast. There is no schema to parse it against at the edge,
// and makePointLookup itself filters to named Polygon/MultiPolygon features, so a
// shape mismatch degrades to "no match", never a crash.
const counties = countiesJson as unknown as FeatureCollection<
  Polygon | MultiPolygon
>;

/**
 * Point-in-polygon lookups the member-route ingest votes with.
 *
 * Region = the UK ceremonial county the point sits in. Country is derived cheaply
 * — "United Kingdom" when a point is in any county, else null — so the Function
 * bundles only the 427KB counties asset, not the 1.6MB world-country file (keeps
 * the Worker bundle small and fast). The seeded club routes keep their real
 * countries from the offline normalise; an overseas member route resolves to
 * country=null, an accepted v2 trade for the small bundle.
 */
export function buildLookups(): Lookups {
  const countyOf = makePointLookup(counties);
  const countryOf = (lng: number, lat: number): string | null =>
    countyOf(lng, lat) ? 'United Kingdom' : null;
  return { countyOf, countryOf };
}
