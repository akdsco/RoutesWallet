/**
 * Canonical country + region (county) vocabulary and the pure resolver that turns
 * a route's start point into a `{ country, region }` pair.
 *
 * Two-level grouping: a route has a `country` (always set once resolved) and,
 * only where the country is "unlocked" (the UK), a `region` = its ceremonial
 * county. `region` is `null` when no county applies (overseas, or unresolved) —
 * never an empty string.
 *
 * This module is deliberately PURE and Turf-free so the app can import the
 * canonical sets. The actual point-in-polygon test lives in `county-lookup.ts`
 * (build/import-time only) and is injected here as `CountyOf`.
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

/** A resolver from a lng/lat to the canonical county its point sits in, or null. */
export type CountyOf = (lng: number, lat: number) => string | null;

export type Resolved = { country: string | null; region: string | null };

/**
 * Overseas training-camp routes carry no UK county; their country is inferred
 * from a name hint (the club's camps are Girona and Calpe, both Spain). Anything
 * else stays `null` rather than guessing.
 */
const NAME_HINTS: ReadonlyArray<[RegExp, string]> = [
  [/\bgirona\b/i, 'Spain'],
  [/\bcalpe\b/i, 'Spain'],
];

export function nameHintCountry(name: string): string | null {
  for (const [re, country] of NAME_HINTS) {
    if (re.test(name)) return country;
  }
  return null;
}

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

/**
 * Resolve country + region by MAJORITY VOTE over a route's sampled points.
 *
 * These are a London club's rides: nearly all start and finish in Greater London
 * but ride OUT to Kent/Essex/Surrey — and Greater London is a large polygon, so a
 * plain distance-majority would wrongly label a "Kent Hills" ride "Greater London".
 * So London is treated as the home county: a ride's region is the away-county it
 * reaches. If any non-London county appears in the votes, the most-voted of THOSE
 * wins (ties alphabetical); only a ride that touches no other county at all stays
 * Greater London (a genuine London loop). With no UK county among the votes the
 * region is null and the country comes from the name hint (Girona/Calpe → Spain)
 * or null. Never returns an empty string.
 */
export function resolveRegionByVotes(
  votes: readonly (string | null)[],
  name: string
): Resolved {
  const counts = new Map<string, number>();
  for (const v of votes) {
    if (v && isUkCounty(v)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0)
    return { country: nameHintCountry(name), region: null };
  const away = [...counts.entries()].filter(([c]) => c !== HOME_COUNTY);
  const pool = away.length > 0 ? away : [...counts.entries()];
  const winner = pool.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // most votes first
    return a[0].localeCompare(b[0]); // then stable alphabetical
  })[0]![0];
  return { country: 'United Kingdom', region: winner };
}
