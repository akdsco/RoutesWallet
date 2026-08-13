import { describe, it, expect } from 'vitest';
import type { Route } from '../types.ts';
import {
  distanceDomain,
  elevationDomain,
  defaultFilters,
  applyFilters,
  isDefault,
  activeFilterCount,
  countyCounts,
  biggestRelaxation,
  widenDistanceTarget,
  countyOf,
  groupKeyOf,
  type Filters,
  type Domains,
} from './filters.ts';

function route(
  id: string,
  over: Partial<Route> & { region?: string } = {}
): Route {
  return {
    id,
    name: id,
    link: `https://example.com/${id}`,
    distance_km: 30,
    source: 'club-verified',
    country: 'United Kingdom',
    region: 'Essex',
    notes: '',
    cafe: '',
    geometry: { type: 'LineString', coordinates: [[0, 0]] },
    centroid: [0, 0],
    ...over,
  };
}

describe('distanceDomain', () => {
  it('floors the min to 5 and clamps the max to the p95 rounded up to 5, keeping the true max', () => {
    // twenty routes 10..105 (step 5) plus one 500 km outlier
    const routes = [
      ...Array.from({ length: 20 }, (_, i) =>
        route(`r${i}`, { distance_km: 10 + i * 5 })
      ),
      route('ultra', { distance_km: 500 }),
    ];
    const d = distanceDomain(routes);
    expect(d.min).toBe(10);
    expect(d.max).toBe(105); // p95 clamps the 500 out of the handle range
    expect(d.hardMax).toBe(500); // true max preserved so the UI can label "105+"
  });

  it('degrades to a zero-width domain for an empty set', () => {
    expect(distanceDomain([])).toEqual({ min: 0, max: 0, hardMax: 0 });
  });
});

describe('elevationDomain', () => {
  it('ignores routes with no elevation', () => {
    const routes = [
      route('a', { elevation_gain_m: 100 }),
      route('b', { elevation_gain_m: 900 }),
      route('c'), // no elevation_gain_m
    ];
    const d = elevationDomain(routes);
    expect(d.min).toBe(100);
    expect(d.max).toBeGreaterThanOrEqual(900);
  });
});

describe('applyFilters', () => {
  const routes = [
    route('essex-flat', {
      region: 'Essex',
      distance_km: 40,
      elevation_gain_m: 200,
    }),
    route('essex-hilly', {
      region: 'Essex',
      distance_km: 60,
      elevation_gain_m: 900,
    }),
    route('kent', { region: 'Kent', distance_km: 40, elevation_gain_m: 300 }),
    route('essex-noelev', {
      region: 'Essex',
      distance_km: 40,
      // no elevation_gain_m
    }),
    route('ultra', {
      region: 'Essex',
      distance_km: 500,
      elevation_gain_m: 100,
    }),
  ];
  const domains: Domains = {
    distance: distanceDomain(routes),
    elevation: elevationDomain(routes),
  };
  const base = defaultFilters(domains);

  it('returns everything at default (top handle includes outliers)', () => {
    const out = applyFilters(routes, base, domains);
    expect(out.map((r) => r.id).sort()).toEqual(
      ['essex-flat', 'essex-hilly', 'essex-noelev', 'kent', 'ultra'].sort()
    );
  });

  it('filters by county (the region field) when counties are chosen', () => {
    const f: Filters = { ...base, counties: new Set(['Kent']) };
    expect(applyFilters(routes, f, domains).map((r) => r.id)).toEqual(['kent']);
  });

  it('excludes outliers once the max distance handle drops below the clamp', () => {
    const f: Filters = { ...base, distance: [domains.distance.min, 100] };
    expect(applyFilters(routes, f, domains).map((r) => r.id)).not.toContain(
      'ultra'
    );
  });

  it('excludes no-elevation routes only when the elevation range is narrowed off default', () => {
    const withElev = applyFilters(
      routes,
      { ...base, elevation: [400, domains.elevation.max] },
      domains
    ).map((r) => r.id);
    expect(withElev).toContain('essex-hilly'); // 900 m passes
    expect(withElev).not.toContain('essex-flat'); // 200 m below floor
    expect(withElev).not.toContain('essex-noelev'); // no elevation → excluded
  });

  it('matches a country field when present, degrading to pass when absent', () => {
    const spain = route('girona', {
      region: 'Hub Velo trips',
      distance_km: 50,
    }) as Route & { country?: string };
    spain.country = 'Spain';
    const uk = route('essex-uk', { region: 'Essex', distance_km: 50 });
    const f: Filters = { ...base, countries: new Set(['Spain']) };
    expect(applyFilters([spain, uk], f, domains).map((r) => r.id)).toEqual([
      'girona',
    ]);
  });
});

describe('isDefault / activeFilterCount', () => {
  const domains: Domains = {
    distance: { min: 10, max: 100, hardMax: 500 },
    elevation: { min: 0, max: 1000, hardMax: 3000 },
  };
  const base = defaultFilters(domains);

  it('a fresh filter set is default and has no active dimensions', () => {
    expect(isDefault(base, domains)).toBe(true);
    expect(activeFilterCount(base, domains)).toBe(0);
  });

  it('each narrowed dimension counts once', () => {
    expect(
      activeFilterCount({ ...base, counties: new Set(['Essex']) }, domains)
    ).toBe(1);
    expect(
      activeFilterCount(
        {
          ...base,
          counties: new Set(['Essex']),
          distance: [20, 80],
        },
        domains
      )
    ).toBe(2);
    expect(isDefault({ ...base, distance: [20, 80] }, domains)).toBe(false);
  });
});

describe('countyOf (county-filter key)', () => {
  it('reads the county for a county-bearing country (UK)', () => {
    expect(countyOf(route('a', { region: 'Kent' }))).toBe('Kent');
  });

  it('is undefined for a UK route with no county — it drops out of the filter', () => {
    expect(countyOf(route('b', { region: '' }))).toBeUndefined();
  });

  it('is undefined for an overseas route (the country filter covers it)', () => {
    expect(
      countyOf(route('c', { country: 'Spain', region: '' }))
    ).toBeUndefined();
  });
});

describe('groupKeyOf (list grouping key)', () => {
  it('groups a UK route under its county', () => {
    expect(groupKeyOf(route('a', { region: 'Kent' }))).toBe('Kent');
  });

  it('a UK route with no county falls back to Other', () => {
    expect(groupKeyOf(route('b', { region: '' }))).toBe('Other');
  });

  it('collapses a county-less country to the country itself (no "Other")', () => {
    expect(groupKeyOf(route('c', { country: 'Spain', region: '' }))).toBe(
      'Spain'
    );
    expect(groupKeyOf(route('d', { country: 'Italy', region: '' }))).toBe(
      'Italy'
    );
  });

  it('falls back to Other only when the country is unknown too', () => {
    expect(groupKeyOf(route('e', { country: null, region: '' }))).toBe('Other');
  });
});

describe('empty-state relaxation', () => {
  const routes = [
    route('e40', { region: 'Essex', distance_km: 40 }),
    route('e60', { region: 'Essex', distance_km: 60 }),
    route('e70', { region: 'Essex', distance_km: 70 }),
    route('k40', { region: 'Kent', distance_km: 40 }),
  ];
  const domains: Domains = {
    distance: distanceDomain(routes),
    elevation: elevationDomain(routes),
  };
  const base = defaultFilters(domains);
  // Kent + distance ≥ 50 excludes everything (the one Kent route is 40 km).
  const empty: Filters = {
    ...base,
    counties: new Set(['Kent']),
    distance: [50, domains.distance.max],
  };

  it('names the dimension whose relaxation adds the most routes', () => {
    const r = biggestRelaxation(routes, empty, domains);
    // dropping the county exposes the two ≥50 km Essex routes (adds 2); dropping
    // the distance exposes only the one Kent route (adds 1) — county wins.
    expect(r).toEqual({ dimension: 'county', adds: 2 });
  });

  it('returns null when no single relaxation helps', () => {
    expect(biggestRelaxation(routes, base, domains)).toBeNull();
  });

  it('widens distance to the nearest bound that yields results', () => {
    const target = widenDistanceTarget(routes, empty, domains);
    // the nearest Kent route is 40 km, just below the 50 km floor
    expect(target).not.toBeNull();
    expect(target![0]).toBeLessThanOrEqual(40);
    expect(
      applyFilters(routes, { ...empty, distance: target! }, domains).length
    ).toBeGreaterThan(0);
  });

  it('has no distance target when the other filters exclude everything', () => {
    const f: Filters = { ...base, counties: new Set(['Nowhere']) };
    expect(widenDistanceTarget(routes, f, domains)).toBeNull();
  });
});

describe('countyCounts', () => {
  const routes = [
    route('e1', { region: 'Essex', distance_km: 40 }),
    route('e2', { region: 'Essex', distance_km: 40 }),
    route('e3', { region: 'Essex', distance_km: 200 }),
    route('k1', { region: 'Kent', distance_km: 40 }),
    route('s1', { region: 'Surrey', distance_km: 200 }),
  ];
  const domains: Domains = {
    distance: distanceDomain(routes),
    elevation: elevationDomain(routes),
  };
  const base = defaultFilters(domains);

  it('counts each county over the pool and orders by count desc', () => {
    const counts = countyCounts(routes, base, domains);
    expect(counts.map((c) => c.value)).toEqual(['Essex', 'Kent', 'Surrey']);
    expect(counts.map((c) => c.count)).toEqual([3, 1, 1]);
  });

  it('counts a county under the OTHER dimensions but ignores the county selection', () => {
    // A distance filter that drops the 200 km routes; Surrey then has 0 but is
    // still listed (dimmed), and selecting Essex must not hide Kent/Surrey.
    const f: Filters = {
      ...base,
      counties: new Set(['Essex']),
      distance: [domains.distance.min, 100],
    };
    const counts = countyCounts(routes, f, domains);
    const byName = Object.fromEntries(counts.map((c) => [c.value, c.count]));
    expect(byName).toEqual({ Essex: 2, Kent: 1, Surrey: 0 });
    // every county still present so a zero-count chip renders dimmed, not gone
    expect(counts.map((c) => c.value).sort()).toEqual([
      'Essex',
      'Kent',
      'Surrey',
    ]);
  });
});
