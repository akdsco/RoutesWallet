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

/**
 * Geometry-first resolution. If the start point falls inside a UK county polygon,
 * the route is United Kingdom + that county. Otherwise the county is null and the
 * country is inferred from the name (or null). Never returns an empty string.
 */
export function resolveCountryRegion(
  input: { start: [number, number]; name: string },
  countyOf: CountyOf
): Resolved {
  const [lng, lat] = input.start;
  const county = countyOf(lng, lat);
  if (county && isUkCounty(county)) {
    return { country: 'United Kingdom', region: county };
  }
  return { country: nameHintCountry(input.name), region: null };
}
