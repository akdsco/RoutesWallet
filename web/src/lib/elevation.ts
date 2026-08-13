/**
 * Total elevation gain from a route's elevation series (the GeoJSON 3rd
 * coordinate, `[lng, lat, ele]`). Pure + unit-tested.
 *
 * WHY THIS EXISTS — the non-Strava gain rule. The 122 Strava routes carry
 * Strava's OWN displayed gain, read off the route page and never recomputed (a
 * different smoothing rule would disagree). The 3 non-Strava routes (RideWithGPS
 * + Garmin) expose no such displayed figure, and hand-typing a page number would
 * be exactly the "hand-edited" data the enrichment forbids. So for those sources
 * — and only those — gain is COMPUTED here from the `<ele>` series. This is the
 * documented exception to the never-recompute rule.
 *
 * METHOD — a hysteresis positive-delta sum. Raw Σ(positive Δele) over a GPS track
 * over-counts badly: metre-scale vertical jitter on every point inflates the
 * total. We instead only bank ascent once the climb since the last reference
 * exceeds a threshold band, and drop the reference on the matching descent so a
 * single climb is never counted twice. The threshold (default 3 m) is the one
 * knob; 3 m is light smoothing that keeps real climbs and rejects noise.
 */

export type ElevationGainOptions = {
  /** Hysteresis band in metres; climbs/drops within it are treated as jitter. */
  threshold?: number;
};

/**
 * Sum the ascent along `coords` (`[lng, lat, ele]` positions) in whole metres.
 * Points without a 3rd coordinate are ignored; a series with fewer than two
 * elevation samples has no gain (returns 0).
 */
export function elevationGainM(
  coords: number[][],
  { threshold = 3 }: ElevationGainOptions = {}
): number {
  let gain = 0;
  // `ref` is the reference elevation of the current continuous run of samples.
  // A point with no elevation resets it to null, so a gap in the series is NOT
  // bridged — banking the delta across an unknown stretch would be a phantom
  // climb. Walking coords directly (rather than compacting to an eles array)
  // is what makes that gap visible.
  let ref: number | null = null;
  for (const c of coords) {
    const e = c[2];
    if (typeof e !== 'number' || !Number.isFinite(e)) {
      ref = null; // gap — break the run
      continue;
    }
    if (ref === null) {
      ref = e; // (re)start a run
    } else if (e - ref >= threshold) {
      gain += e - ref; // bank the climb, advance the reference up
      ref = e;
    } else if (ref - e >= threshold) {
      ref = e; // descending — track the trough so the next climb counts once
    }
    // within the band: jitter, ignore
  }
  return Math.round(gain);
}
