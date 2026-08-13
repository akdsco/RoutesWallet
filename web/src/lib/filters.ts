import type { Route } from '../types.ts';

/**
 * The filter model behind §G: filters define the *pool* (search then ranks within
 * it, sort orders survivors). Pure — unit tested. County is keyed on the existing
 * `region` field today (a separate data ticket normalises region→county + adds
 * `country`); nothing here changes when that lands.
 */

export type Range = [min: number, max: number];

/**
 * A slider's numeric domain. `min`/`max` bound the handles; `hardMax` is the true
 * data maximum. When `hardMax > max` the data has outliers clamped out of the
 * handle range (p95), and a range sitting at `max` means "no upper limit" — the
 * outliers are bucketed at the top handle (UI labels it e.g. "105+").
 */
export type Domain = { min: number; max: number; hardMax: number };

export type Domains = { distance: Domain; elevation: Domain };

export type Filters = {
  /** Chosen counties (the `region` field); empty = all counties. */
  counties: ReadonlySet<string>;
  /** Chosen countries; empty = all. Dead until the data ticket adds `country`. */
  countries: ReadonlySet<string>;
  /** [min, max] km. At the domain edges = no distance constraint. */
  distance: Range;
  /** [min, max] m. Off-default excludes routes with no elevation. */
  elevation: Range;
};

/** The clamp percentile — keeps a handful of ultra/trip outliers off the handle. */
const CLAMP_PCTL = 95;

const floor5 = (x: number) => Math.floor(x / 5) * 5;
const ceil5 = (x: number) => Math.ceil(x / 5) * 5;

/** Nearest-rank percentile of `values` (unsorted ok), rounded outward up to 5. */
export function percentileUp5(values: number[], pctl: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((pctl / 100) * sorted.length); // 1-based
  const i = Math.min(sorted.length, Math.max(1, rank)) - 1;
  return ceil5(sorted[i]!);
}

function domainOf(values: number[]): Domain {
  if (values.length === 0) return { min: 0, max: 0, hardMax: 0 };
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const min = floor5(dataMin);
  const max = Math.max(min + 5, percentileUp5(values, CLAMP_PCTL));
  return { min, max, hardMax: ceil5(dataMax) };
}

export function distanceDomain(routes: Route[]): Domain {
  return domainOf(routes.map((r) => r.distance_km));
}

export function elevationDomain(routes: Route[]): Domain {
  const vals = routes
    .map((r) => r.elevation_gain_m)
    .filter((v): v is number => typeof v === 'number');
  return domainOf(vals);
}

/**
 * Which countries carry county-level data (a county filter + county groups).
 * Others collapse to a single country-level group. Hardcoded stopgap — one
 * boolean per country we hold routes for — until country handling is reworked.
 */
export const COUNTRY_HAS_COUNTIES: Record<string, boolean> = {
  'United Kingdom': true,
  Spain: false,
  Italy: false,
};

/** Country of a route, or undefined when unresolved. */
export function countryOf(r: Route): string | undefined {
  return typeof r.country === 'string' && r.country !== ''
    ? r.country
    : undefined;
}

/**
 * The COUNTY filter key: the UK county for a county-bearing country, else
 * undefined. Overseas routes aren't county-filterable (they have no county — the
 * country filter covers them), so they drop out of the county chip row and the
 * county filter rather than piling into a vague "Other".
 */
export function countyOf(r: Route): string | undefined {
  const c = countryOf(r);
  return c && COUNTRY_HAS_COUNTIES[c] ? r.region || undefined : undefined;
}

/**
 * The LIST grouping key: a county-bearing country's route groups under its county
 * (blank → "Other"); a country without county data (Spain, Italy) collapses to
 * the country itself — never a vague "Other". Falls back to "Other" only when the
 * country is unknown too.
 */
export function groupKeyOf(r: Route): string {
  const c = countryOf(r);
  if (c && COUNTRY_HAS_COUNTIES[c]) return r.region || 'Other';
  return c ?? 'Other';
}

export function defaultFilters(domains: Domains): Filters {
  return {
    counties: new Set(),
    countries: new Set(),
    distance: [domains.distance.min, domains.distance.max],
    elevation: [domains.elevation.min, domains.elevation.max],
  };
}

/** Is a range at (or beyond) both domain edges — i.e. constraining nothing? */
export function rangeIsDefault(range: Range, domain: Domain): boolean {
  return range[0] <= domain.min && range[1] >= domain.max;
}

/** A value passes `range`; the top edge means "unbounded" so outliers pass. */
function inRange(v: number, range: Range, domain: Domain): boolean {
  if (v < range[0]) return false;
  if (range[1] >= domain.max) return true;
  return v <= range[1];
}

/** The pool: routes matching every active dimension (county ∧ country ∧ dist ∧ elev). */
export function applyFilters(
  routes: Route[],
  filters: Filters,
  domains: Domains
): Route[] {
  const elevActive = !rangeIsDefault(filters.elevation, domains.elevation);
  return routes.filter((r) => {
    if (filters.counties.size) {
      const cty = countyOf(r);
      if (cty === undefined || !filters.counties.has(cty)) return false;
    }
    if (filters.countries.size) {
      const c = countryOf(r);
      if (c === undefined || !filters.countries.has(c)) return false;
    }
    if (!inRange(r.distance_km, filters.distance, domains.distance)) {
      return false;
    }
    if (elevActive) {
      if (r.elevation_gain_m == null) return false;
      if (!inRange(r.elevation_gain_m, filters.elevation, domains.elevation)) {
        return false;
      }
    }
    return true;
  });
}

export type ChipCount = { value: string; count: number };

/** Chip counts for one dimension: every value in the data, ordered by count desc. */
function chipCounts(
  allRoutes: Route[],
  pool: Route[],
  keyOf: (r: Route) => string | undefined
): ChipCount[] {
  const order = new Map<string, number>(); // value → first-seen index
  for (const r of allRoutes) {
    const k = keyOf(r);
    if (k !== undefined && !order.has(k)) order.set(k, order.size);
  }
  const counts = new Map<string, number>();
  for (const r of pool) {
    const k = keyOf(r);
    if (k !== undefined) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...order.keys()]
    .map((value) => ({ value, count: counts.get(value) ?? 0 }))
    .sort(
      (a, b) => b.count - a.count || order.get(a.value)! - order.get(b.value)!
    );
}

/**
 * County chips: each county's route count under the *other* active dimensions
 * (the county selection itself is ignored, so selecting one county never hides the
 * rest, and a county legitimately reading 0 stays listed for a dimmed chip).
 */
export function countyCounts(
  routes: Route[],
  filters: Filters,
  domains: Domains
): ChipCount[] {
  const pool = applyFilters(
    routes,
    { ...filters, counties: new Set() },
    domains
  );
  return chipCounts(routes, pool, countyOf);
}

/** Country chips — same rule as counties; empty until the data ticket adds `country`. */
export function countryCounts(
  routes: Route[],
  filters: Filters,
  domains: Domains
): ChipCount[] {
  const pool = applyFilters(
    routes,
    { ...filters, countries: new Set() },
    domains
  );
  return chipCounts(routes, pool, countryOf);
}

export type FilterDimension = 'county' | 'country' | 'distance' | 'elevation';

/** A filter set with one dimension reset to its default (widest) value. */
function withoutDimension(
  filters: Filters,
  dim: FilterDimension,
  domains: Domains
): Filters {
  switch (dim) {
    case 'county':
      return { ...filters, counties: new Set() };
    case 'country':
      return { ...filters, countries: new Set() };
    case 'distance':
      return {
        ...filters,
        distance: [domains.distance.min, domains.distance.max],
      };
    case 'elevation':
      return {
        ...filters,
        elevation: [domains.elevation.min, domains.elevation.max],
      };
  }
}

export type Relaxation = { dimension: FilterDimension; adds: number };

/**
 * The single dimension whose relaxation would add the most routes — powers the
 * empty state's "Widening the distance range would add N routes". Considers only
 * active dimensions; null when nothing single-handedly helps. Cheap on ~125 routes.
 */
export function biggestRelaxation(
  routes: Route[],
  filters: Filters,
  domains: Domains
): Relaxation | null {
  const current = applyFilters(routes, filters, domains).length;
  const dims: FilterDimension[] = [
    'county',
    'country',
    'distance',
    'elevation',
  ];
  let best: Relaxation | null = null;
  for (const dimension of dims) {
    const relaxed = withoutDimension(filters, dimension, domains);
    const adds = applyFilters(routes, relaxed, domains).length - current;
    if (adds > 0 && (!best || adds > best.adds)) best = { dimension, adds };
  }
  return best;
}

/**
 * The nearest distance range that yields ≥1 result, keeping the other filters —
 * "a nudge, not a reset" behind the empty state's "Widen distance". Null when the
 * other dimensions already exclude everything (widening distance can't help).
 */
export function widenDistanceTarget(
  routes: Route[],
  filters: Filters,
  domains: Domains
): Range | null {
  const dd = domains.distance;
  const [lo, hi] = filters.distance;
  const candidates = applyFilters(
    routes,
    { ...filters, distance: [dd.min, dd.max] },
    domains
  ).map((r) => r.distance_km);
  if (candidates.length === 0) return null;

  let best: { range: Range; cost: number } | null = null;
  for (const d of candidates) {
    let range: Range;
    let cost: number;
    if (d < lo) {
      range = [Math.max(dd.min, floor5(d)), hi];
      cost = lo - d;
    } else if (d > hi) {
      range = [lo, d >= dd.max ? dd.max : ceil5(d)];
      cost = d - hi;
    } else {
      range = [lo, hi];
      cost = 0;
    }
    if (!best || cost < best.cost) best = { range, cost };
  }
  return best?.range ?? null;
}

export function isDefault(filters: Filters, domains: Domains): boolean {
  return (
    filters.counties.size === 0 &&
    filters.countries.size === 0 &&
    rangeIsDefault(filters.distance, domains.distance) &&
    rangeIsDefault(filters.elevation, domains.elevation)
  );
}

/** Number of narrowed dimensions — the count-pill value on the panel header. */
export function activeFilterCount(filters: Filters, domains: Domains): number {
  let n = 0;
  if (filters.counties.size) n++;
  if (filters.countries.size) n++;
  if (!rangeIsDefault(filters.distance, domains.distance)) n++;
  if (!rangeIsDefault(filters.elevation, domains.elevation)) n++;
  return n;
}
