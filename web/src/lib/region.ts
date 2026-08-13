/**
 * Canonical country + region (county) vocabulary and the pure resolver that turns
 * a route's sampled points into a `{ country, region }` pair by majority vote.
 *
 * Two-level grouping: a route has a `country` (always set once resolved) and,
 * only where the country is "unlocked" (the UK), a `region` = its ceremonial
 * county. `region` is `null` when no county applies (overseas, or unresolved) —
 * never an empty string.
 *
 * This module is deliberately PURE and Turf-free so the app can import the
 * canonical sets. The actual point-in-polygon test lives in `county-lookup.ts`
 * (build/import-time only) and is injected here as a `PointLookup` — built over
 * the county boundaries for region votes, or the world-country boundaries for
 * country votes.
 */

/** The ceremonial counties of England — the closed, documented region set. */
export const UK_COUNTIES = Object.freeze([
  'Bedfordshire',
  'Berkshire',
  'Bristol',
  'Buckinghamshire',
  'Cambridgeshire',
  'Cheshire',
  'City of London',
  'Cornwall',
  'Cumbria',
  'Derbyshire',
  'Devon',
  'Dorset',
  'Durham',
  'East Riding of Yorkshire',
  'East Sussex',
  'Essex',
  'Gloucestershire',
  'Greater London',
  'Greater Manchester',
  'Hampshire',
  'Herefordshire',
  'Hertfordshire',
  'Isle of Wight',
  'Kent',
  'Lancashire',
  'Leicestershire',
  'Lincolnshire',
  'Merseyside',
  'Norfolk',
  'North Yorkshire',
  'Northamptonshire',
  'Northumberland',
  'Nottinghamshire',
  'Oxfordshire',
  'Rutland',
  'Shropshire',
  'Somerset',
  'South Yorkshire',
  'Staffordshire',
  'Suffolk',
  'Surrey',
  'Tyne and Wear',
  'Warwickshire',
  'West Midlands',
  'West Sussex',
  'West Yorkshire',
  'Wiltshire',
  'Worcestershire',
] as const);

export type UkCounty = (typeof UK_COUNTIES)[number];

const UK_COUNTY_SET: ReadonlySet<string> = new Set(UK_COUNTIES);

/** True only for a canonical full county name (so 'Herts'/'London' are rejected). */
export function isUkCounty(name: string): name is UkCounty {
  return UK_COUNTY_SET.has(name);
}

/** A resolver from a lng/lat to the name of the polygon it sits in, or null.
 *  Generic: built over the county boundaries (→ region) or the world-country
 *  boundaries (→ country). See `county-lookup.ts`. */
export type PointLookup = (lng: number, lat: number) => string | null;

/** How many points to sample along a route when voting on its county. */
export const SAMPLE_COUNT = 5;

/**
 * Evenly sample `count` items across an array by index, endpoints included
 * (e.g. count 5 → fractions 0, ¼, ½, ¾, 1). `count <= 1` → the first item;
 * an empty array → []. Used to pick points spread along a route's line.
 */
export function sampleAlong<T>(items: readonly T[], count: number): T[] {
  const n = items.length;
  if (n === 0) return [];
  if (n === 1 || count <= 1) return [items[0]!];
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(items[Math.round((i / (count - 1)) * (n - 1))]!);
  }
  return out;
}

/** The club's home county — the start/finish of nearly every ride, never its point. */
export const HOME_COUNTY = 'Greater London';

/** Pick the most-voted key from a tally; ties break alphabetically. */
function topOf(counts: Map<string, number>): string | null {
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // most votes first
    return a[0].localeCompare(b[0]); // then stable alphabetical
  })[0]![0];
}

/**
 * Resolve a route's REGION (UK county) by majority vote over its sampled points.
 *
 * These are a London club's rides: nearly all start and finish in Greater London
 * but ride OUT to Kent/Essex/Surrey — and Greater London is a large polygon, so a
 * plain distance-majority would wrongly label a "Kent Hills" ride "Greater London".
 * So London is treated as the home county: a ride's region is the away-county it
 * reaches. If any non-London county appears in the votes, the most-voted of THOSE
 * wins (ties alphabetical); only a ride that touches no other county at all stays
 * Greater London. With no UK county among the votes → null (e.g. overseas).
 */
export function resolveRegionByVotes(
  votes: readonly (string | null)[]
): string | null {
  const counts = new Map<string, number>();
  for (const v of votes) {
    if (v && isUkCounty(v)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const away = new Map([...counts].filter(([c]) => c !== HOME_COUNTY));
  return topOf(away.size > 0 ? away : counts);
}

/**
 * Resolve a route's COUNTRY by plain majority vote over its sampled points
 * (against the world-country boundaries). Ties break alphabetically; no UK-style
 * home-county rule applies. `null` when no point resolved to a country.
 */
export function resolveCountryByVotes(
  votes: readonly (string | null)[]
): string | null {
  const counts = new Map<string, number>();
  for (const v of votes) {
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return topOf(counts);
}
