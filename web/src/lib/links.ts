/**
 * Where a route's link goes, keyed by a substring of its host. First match
 * wins, so order most-specific first. The label is the destination's name; the
 * "Open in " prefix and the ↗ affordance are added by the caller/UI.
 */
const PROVIDERS: ReadonlyArray<readonly [needle: string, name: string]> = [
  ['strava.', 'Strava'],
  ['garmin.', 'Garmin Connect'],
  ['komoot.', 'Komoot'],
  ['ridewithgps.', 'RideWithGPS'],
  ['wahoo', 'Wahoo'],
  ['bikemap.', 'Bikemap'],
  ['plotaroute.', 'Plotaroute'],
  ['mapmyride.', 'MapMyRide'],
  ['veloviewer.', 'VeloViewer'],
  ['cycle.travel', 'Cycle.travel'],
];

/**
 * Label for the "open this route" action, from where the link points. Returns
 * the bare label (no arrow) — e.g. "Open in Strava", "Download GPX", or the
 * neutral "Open route" for an unknown host.
 */
export function openLabel(link: string): string {
  const url = link.toLowerCase();
  if (/\.gpx($|\?|#)/.test(url)) return 'Download GPX';
  for (const [needle, name] of PROVIDERS) {
    if (url.includes(needle)) return `Open in ${name}`;
  }
  return 'Open route';
}
