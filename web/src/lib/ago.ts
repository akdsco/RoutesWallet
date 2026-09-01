/** A coarse "N units ago" label for the Settings last-synced line. Pure. */
export function relativeTime(then: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 45) return 'just now';
  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  const m = Math.round(s / 60);
  if (m < 60) return plural(m, 'minute');
  const h = Math.round(m / 60);
  if (h < 24) return plural(h, 'hour');
  return plural(Math.round(h / 24), 'day');
}
