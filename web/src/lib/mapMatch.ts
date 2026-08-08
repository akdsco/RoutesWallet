/**
 * Pure helpers for the offline map-match pipeline (TB-46).
 *
 * The pipeline snaps the club's *road* routes onto the road network so their
 * lines sit pixel-perfect on the map (Strava geometry vs OSM road rendering
 * drift a few metres apart at max zoom). Matching is done OFFLINE at import time
 * via FOSSGIS Valhalla `trace_route` (bicycle profile) — the app stays static
 * and keyless. See `scripts/map-match.ts` for the runner; this module holds the
 * pieces worth unit-testing.
 *
 * HARD CONSTRAINT: never snap a gravel / off-road route onto tarmac — that would
 * falsify it. Eligibility is Road-only, and two off-road routes that carry a
 * 'Road' tag are excluded by name. If in doubt, a route is left un-matched.
 */

/** Feature-properties subset the eligibility check needs. */
export type MatchProps = {
  name: string;
  route_type?: string;
};

/**
 * Routes tagged `route_type: 'Road'` that are really gravel / mixed-surface, so
 * they must be excluded from matching (spot-checked against the ticket's
 * "11 gravel/off-road routes" — the other 9 are already tagged 'Gravel').
 */
export const GRAVEL_NAME_EXCLUSIONS: readonly string[] = [
  'Strade Bambini - 70km',
  'Blackmore 80km (with gravel section)',
];

/**
 * A route may be map-matched only if it is explicitly tagged as a Road route and
 * is not one of the named off-road exceptions. Untyped routes (empty / missing
 * `route_type`) are deliberately left un-matched — "if in doubt, leave it".
 */
export function isEligibleForMatch(props: MatchProps): boolean {
  if (props.route_type !== 'Road') return false;
  if (GRAVEL_NAME_EXCLUSIONS.includes(props.name)) return false;
  return true;
}

/**
 * Decode an encoded polyline (Google/Valhalla algorithm) into `[lng, lat]` pairs
 * (GeoJSON order). `precision` is the number of decimal places the encoder used
 * (5 for Google/OSRM, 6 for Valhalla shapes).
 */
export function decodePolyline(
  encoded: string,
  precision: number
): [number, number][] {
  const factor = Math.pow(10, precision);
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

/** Decode a Valhalla shape (precision 6) into `[lng, lat]` pairs. */
export function decodePolyline6(encoded: string): [number, number][] {
  return decodePolyline(encoded, 6);
}

export type AcceptMatchInput = {
  /** The route's own recorded length, km (from `distance_km`). */
  rawKm: number;
  /** The matched route length Valhalla reports, km. */
  matchedKm: number;
  /** Fraction of the input trace the match covered (0..1). */
  coveredFraction: number;
};

export type AcceptMatchOptions = {
  /** Max |matchedKm - rawKm| / rawKm before the match is rejected. Default 0.15. */
  maxDeviation?: number;
  /** Min covered fraction of the trace before the match is rejected. Default 0.99. */
  minCoverage?: number;
};

export type AcceptMatchResult = { ok: boolean; reason?: string };

/**
 * The quality gate. A match is accepted only if it covers (almost) the whole
 * input trace and its length stays close to the route's own recorded length.
 * Anything else falls back to the raw geometry — we never ship a bad snap.
 */
export function acceptMatch(
  { rawKm, matchedKm, coveredFraction }: AcceptMatchInput,
  { maxDeviation = 0.15, minCoverage = 0.99 }: AcceptMatchOptions = {}
): AcceptMatchResult {
  if (coveredFraction < minCoverage) {
    return {
      ok: false,
      reason: `coverage ${(coveredFraction * 100).toFixed(1)}% < ${(minCoverage * 100).toFixed(0)}%`,
    };
  }
  const deviation = rawKm > 0 ? Math.abs(matchedKm - rawKm) / rawKm : 0;
  if (deviation > maxDeviation) {
    return {
      ok: false,
      reason: `length deviation ${(deviation * 100).toFixed(1)}% > ${(maxDeviation * 100).toFixed(0)}%`,
    };
  }
  return { ok: true };
}
