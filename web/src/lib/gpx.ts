/**
 * Pure parsers for StravaGPX exports. Used by the route importer (and the live
 * re-enrichment run) to pull geometry, elevation, and owner out of the GPX we
 * already download per route. Kept pure and unit-tested so the extraction logic
 * has one source of truth; the browser-side glue only fetches and assembles.
 */

const COORD_DP = 6; // precision normalisation (~0.11 m), never point-dropping

/** Round to a fixed number of decimals, returning a plain number. */
function round(n: number, dp: number): number {
  return Number(n.toFixed(dp));
}

/**
 * Parse `<trkpt lat lon><ele>…</ele></trkpt>` into positions. Elevation rides
 * along as the standard GeoJSON 3rd coordinate (`[lng, lat, ele]`), rounded to
 * whole metres (GPS vertical accuracy is ±several m). A trackpoint without an
 * `<ele>` yields a 2D `[lng, lat]` rather than a bogus zero.
 */
export function parseTrackpoints(gpx: string): number[][] {
  const out: number[][] = [];
  const re =
    /<trkpt\s+lat="([-0-9.]+)"\s+lon="([-0-9.]+)"\s*\/?>([\s\S]*?)(?=<trkpt|<\/trkseg|<\/trk>|$)/g;
  for (const m of gpx.matchAll(re)) {
    const lat = parseFloat(m[1] ?? '');
    const lng = parseFloat(m[2] ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const pos: number[] = [round(lng, COORD_DP), round(lat, COORD_DP)];
    const ele = (m[3] ?? '').match(/<ele>([-0-9.]+)<\/ele>/);
    if (ele?.[1]) pos.push(Math.round(parseFloat(ele[1])));
    out.push(pos);
  }
  return out;
}

/**
 * Extract the route owner from `<metadata><author>`: their display name and
 * Strava athlete id (from the author link). Returns null when absent.
 */
export function parseAuthor(
  gpx: string
): { name: string; stravaId: string } | null {
  const block = gpx.match(/<author>([\s\S]*?)<\/author>/)?.[1];
  if (!block) return null;
  const raw = block.match(/<name>([^<]*)<\/name>/)?.[1];
  if (!raw) return null;
  // Strip Strava's enclosed-alphanumeric "verified" badge glyph (e.g. "ⓥ") and
  // collapse whitespace so owner names store clean.
  const name = [...raw]
    .filter((c) => {
      const cp = c.codePointAt(0) ?? 0;
      return cp < 0x2460 || cp > 0x24ff;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return null;
  const stravaId = block.match(/\/athletes\/(\d+)/)?.[1] ?? '';
  return { name, stravaId };
}

/**
 * Parse a Strava summary stat rendered as metres (e.g. "388 m", "1,234 m") to a
 * whole-number metre value. Returns null for non-metre stats (km, time, empty) —
 * so callers can pick the elevation value out of a mixed set of stats.
 */
export function parseStatMeters(s: string): number | null {
  const m = s.trim().match(/^([\d,]+(?:\.\d+)?)\s*m$/);
  if (!m?.[1]) return null;
  return Math.round(parseFloat(m[1].replace(/,/g, '')));
}
