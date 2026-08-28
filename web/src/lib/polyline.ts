/**
 * Decode a Google/Strava encoded polyline (precision 5) into GeoJSON `[lng, lat]`
 * pairs. Strava returns a route's line as `map.summary_polyline` in this format,
 * so this is the list-only path's geometry source (no per-route GPX fetch).
 *
 * This is format decoding, not geo maths (no distance/proximity), so it does not
 * go through Turf — same call the repo already makes for its hand-written GPX
 * parser. Pure + unit-tested against the canonical reference vector.
 */
export function decodePolyline(
  encoded: string,
  precision = 5
): [number, number][] {
  const factor = Math.pow(10, precision);
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const nextDelta = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += nextDelta();
    lng += nextDelta();
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}
