/**
 * The count line (§G) — the whole feedback mechanism for filters + search. The
 * "of M filtered" phrasing is load-bearing: it tells the rider a thin result is
 * their own filter, not a thin library, so we never collapse to a bare number
 * while filters are active. Pure — unit tested; shares App's aria-live region.
 */

export type CountLineInput = {
  /** Total routes in the library. */
  total: number;
  /** Routes in the filtered pool. */
  poolCount: number;
  /** Routes matching the search within the pool (only when `place` is set). */
  matchCount: number;
  hasFilters: boolean;
  /** The searched place name, or '' when idle. */
  place: string;
  radiusKm: number;
};

export function countLine({
  total,
  poolCount,
  matchCount,
  hasFilters,
  place,
  radiusKm,
}: CountLineInput): string {
  if (place) {
    const head = `Within ${radiusKm} km of ${place}`;
    return hasFilters
      ? `${head} · ${matchCount} of ${poolCount} filtered`
      : `${head} · ${matchCount} routes`;
  }
  return hasFilters ? `${poolCount} of ${total} routes` : `${total} routes`;
}
