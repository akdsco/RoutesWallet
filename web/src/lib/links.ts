/** Label for the "open this route" action, based on where the link points. */
export function openLabel(link: string): string {
  if (link.includes('komoot')) return 'Open in Komoot ↗';
  if (link.includes('ridewithgps')) return 'Open in RideWithGPS ↗';
  return 'Open in Strava ↗';
}
