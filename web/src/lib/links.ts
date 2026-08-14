/**
 * Where a route's link goes, keyed by a substring of its host. First match
 * wins, so order most-specific first. The label is the destination's name; the
 * "Open in " prefix and the ↗ affordance are added by the caller/UI.
 */
// `name` is the long label ("Open in <name>"); `short` is the §H source-button
// word ("Strava ↗", "RWGPS ↗") — the button names its destination in one word.
const PROVIDERS: ReadonlyArray<
  readonly [needle: string, name: string, short: string]
> = [
  ['strava.', 'Strava', 'Strava'],
  ['garmin.', 'Garmin Connect', 'Garmin'],
  ['komoot.', 'Komoot', 'Komoot'],
  ['ridewithgps.', 'RideWithGPS', 'RWGPS'],
  ['wahoo', 'Wahoo', 'Wahoo'],
  ['bikemap.', 'Bikemap', 'Bikemap'],
  ['plotaroute.', 'Plotaroute', 'Plotaroute'],
  ['mapmyride.', 'MapMyRide', 'MapMyRide'],
  ['veloviewer.', 'VeloViewer', 'VeloViewer'],
  ['cycle.travel', 'Cycle.travel', 'Cycle.travel'],
];

/** True when the link is a GPX file — a download (↓), not an open-in-tab (↗). */
export function isGpxLink(link: string): boolean {
  return /\.gpx($|\?|#)/.test(link.toLowerCase());
}

/**
 * Label for the "open this route" action, from where the link points. Returns
 * the bare label (no arrow) — e.g. "Open in Strava", "Download GPX", or the
 * neutral "Open route" for an unknown host.
 */
export function openLabel(link: string): string {
  const url = link.toLowerCase();
  if (isGpxLink(url)) return 'Download GPX';
  for (const [needle, name] of PROVIDERS) {
    if (url.includes(needle)) return `Open in ${name}`;
  }
  return 'Open route';
}

/**
 * Short one-word label for the §H source button ("Strava", "RWGPS", "GPX") — the
 * caller appends the arrow (↗ open / ↓ download; see {@link isGpxLink}). "Route"
 * is the neutral fallback for an unknown host.
 */
export function sourceShortLabel(link: string): string {
  const url = link.toLowerCase();
  if (isGpxLink(url)) return 'GPX';
  for (const [needle, , short] of PROVIDERS) {
    if (url.includes(needle)) return short;
  }
  return 'Route';
}
