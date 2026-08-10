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

/** Coordinate precision for the output — ~0.11 m, matching the import script. */
const COORD_DP = 6;

const round6 = (n: number): number => Number(n.toFixed(COORD_DP));

/**
 * Join a match's per-leg coordinate arrays into one line: normalise every point
 * to 6 dp, and drop the seam point a leg shares with the previous leg's end
 * (Valhalla repeats the joint vertex). Full resolution is preserved — this only
 * removes exact duplicates, it never decimates.
 */
export function dedupeAndNormalize(
  legs: [number, number][][]
): [number, number][] {
  const out: [number, number][] = [];
  for (const leg of legs) {
    for (const [lng, lat] of leg) {
      const pt: [number, number] = [round6(lng), round6(lat)];
      const prev = out[out.length - 1];
      if (prev && prev[0] === pt[0] && prev[1] === pt[1]) continue;
      out.push(pt);
    }
  }
  return out;
}

/** Decode and assemble a match's per-leg encoded shapes into one clean line. */
export function assembleMatchedCoords(legShapes: string[]): [number, number][] {
  return dedupeAndNormalize(legShapes.map(decodePolyline6));
}

/**
 * Split a trace into contiguous chunks of at most `size` points that SHARE their
 * boundary point (chunk N's last point == chunk N+1's first point). Matching each
 * chunk independently sidesteps the way Valhalla `map_snap` truncates a whole
 * route at the first unroutable spot — a bad spot then only costs its own chunk.
 * The shared boundary means adjacent matched chunks meet at the same road point.
 */
export function chunkTrace(
  coords: [number, number][],
  size: number
): [number, number][][] {
  if (size < 2) throw new Error('chunkTrace: size must be >= 2');
  if (coords.length <= size) return [coords.slice()];
  const chunks: [number, number][][] = [];
  const step = size - 1; // overlap of one point => shared seam
  for (let start = 0; start < coords.length - 1; start += step) {
    chunks.push(coords.slice(start, Math.min(start + size, coords.length)));
  }
  return chunks;
}

/**
 * Concatenate per-chunk matched lines into one, dropping only the seam point a
 * chunk shares with the previous chunk's end (the shared boundary, matched twice
 * and landing within `epsilon` degrees). Interior points are never touched, so
 * full resolution is preserved; a genuine gap at a raw-fallback seam is kept.
 */
export function stitchChunks(
  chunks: [number, number][][],
  epsilon = 1e-5
): [number, number][] {
  const out: [number, number][] = [];
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const pt = chunk[i]!;
      const prev = out[out.length - 1];
      if (
        i === 0 &&
        prev &&
        Math.abs(prev[0] - pt[0]) < epsilon &&
        Math.abs(prev[1] - pt[1]) < epsilon
      ) {
        continue; // shared seam point — drop the duplicate
      }
      out.push(pt);
    }
  }
  return out;
}

export type MarginChunk = {
  /** Points sent to the matcher: the core PLUS a context margin each side. */
  input: [number, number][];
  /** Index (within `input`) of the first core point to keep after trimming. */
  coreStart: number;
  /** Index (within `input`) of the last core point to keep after trimming. */
  coreEnd: number;
};

/**
 * Split a trace into non-overlapping CORE windows of `core` points, each carrying
 * a context `margin` of extra points on both sides for the matcher. The cores
 * tile the whole trace exactly; the margins overlap. Matching each padded chunk
 * but keeping only its core means every core point has surrounding context, which
 * stops the matcher inventing detours near a chunk's edge. Trim back with
 * `coreFromMatch`.
 */
export function chunkWithMargins(
  coords: [number, number][],
  core: number,
  margin: number
): MarginChunk[] {
  if (core < 2) throw new Error('chunkWithMargins: core must be >= 2');
  const n = coords.length;
  if (n <= core)
    return [{ input: coords.slice(), coreStart: 0, coreEnd: n - 1 }];
  const out: MarginChunk[] = [];
  for (let cs = 0; cs < n; cs += core) {
    const ce = Math.min(cs + core, n) - 1; // core input range [cs..ce]
    const is = Math.max(0, cs - margin); // padded start
    const ie = Math.min(n - 1, ce + margin); // padded end
    out.push({
      input: coords.slice(is, ie + 1),
      coreStart: cs - is,
      coreEnd: ce - is,
    });
    if (ce === n - 1) break;
  }
  return out;
}

/** Index of the point in `shape` nearest (planar) to `target`. */
function nearestIndex(
  shape: [number, number][],
  target: [number, number]
): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < shape.length; i++) {
    const dx = shape[i]![0] - target[0];
    const dy = shape[i]![1] - target[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Trim a matched `shape` (full road geometry) down to the portion covering a
 * chunk's core, using `matched` (the matcher's per-input-point snapped positions,
 * `null` where a point didn't match). Returns the road geometry between the
 * snapped core-start and core-end points — the margins are discarded so stitched
 * cores tile without overlap. Full resolution is preserved (a slice of the road
 * geometry). Returns [] if no core point matched.
 */
export function coreFromMatch(
  shape: [number, number][],
  matched: ([number, number] | null)[],
  coreStart: number,
  coreEnd: number
): [number, number][] {
  if (shape.length === 0) return [];
  let s = coreStart;
  while (s <= coreEnd && !matched[s]) s++;
  let e = coreEnd;
  while (e >= coreStart && !matched[e]) e--;
  if (s > e) return [];
  let a = nearestIndex(shape, matched[s]!);
  let b = nearestIndex(shape, matched[e]!);
  if (a > b) [a, b] = [b, a];
  return dedupeAndNormalize([shape.slice(a, b + 1)]);
}

const EARTH_R = 6371000;
const toRad = (x: number): number => (x * Math.PI) / 180;

/** Great-circle metres between two [lng, lat] points (build-time QA only). */
function haversine(p: [number, number], q: [number, number]): number {
  const dLat = toRad(q[1] - p[1]);
  const dLng = toRad(q[0] - p[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p[1])) * Math.cos(toRad(q[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

/**
 * How far the matched line wanders from the raw (drawn) line, in metres — the
 * max over matched points of the distance to the nearest raw point. A grid index
 * keeps it fast. This over-reads by up to ~half the raw point spacing, so it is a
 * gross-detour BACKSTOP (a mis-snap onto a parallel road reads far higher than a
 * clean snap), not a precise measure. Build-time QA gate only.
 */
export function maxStrayMeters(
  matched: [number, number][],
  raw: [number, number][]
): number {
  const CELL = 0.004; // ~300 m grid cells
  const key = (x: number, y: number): string =>
    `${Math.round(x / CELL)},${Math.round(y / CELL)}`;
  const grid = new Map<string, [number, number][]>();
  for (const q of raw) {
    const k = key(q[0], q[1]);
    let arr = grid.get(k);
    if (!arr) grid.set(k, (arr = []));
    arr.push(q);
  }
  let worst = 0;
  for (const p of matched) {
    const cx = Math.round(p[0] / CELL);
    const cy = Math.round(p[1] / CELL);
    let mn = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = grid.get(`${cx + dx},${cy + dy}`);
        if (!arr) continue;
        for (const q of arr) {
          const d = haversine(p, q);
          if (d < mn) mn = d;
        }
      }
    }
    if (mn > worst) worst = mn;
  }
  return worst;
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
