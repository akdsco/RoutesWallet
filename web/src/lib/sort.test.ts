import { describe, it, expect } from 'vitest';
import {
  sortRoutes,
  SORT_OPTIONS,
  isSortKey,
  sortOnSearch,
  sortOnClear,
  sortOnPick,
  INITIAL_SORT,
} from './sort.ts';
import type { Route } from '../types.ts';

function route(id: string, over: Partial<Route> = {}): Route {
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

const routes = [
  route('c', { name: 'Charlie', distance_km: 50, elevation_gain_m: 300 }),
  route('a', { name: 'Alpha', distance_km: 20, elevation_gain_m: 900 }),
  route('b', { name: 'Bravo', distance_km: 80 }), // no elevation
];

describe('sortRoutes', () => {
  it('name A–Z', () => {
    expect(sortRoutes(routes, 'name-az').map((r) => r.name)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
  });

  it('distance ascending / descending', () => {
    expect(
      sortRoutes(routes, 'distance-asc').map((r) => r.distance_km)
    ).toEqual([20, 50, 80]);
    expect(
      sortRoutes(routes, 'distance-desc').map((r) => r.distance_km)
    ).toEqual([80, 50, 20]);
  });

  it('nearest uses the nearKm map, missing distances last', () => {
    const nearKm = new Map([
      ['c', 1],
      ['a', 5],
    ]); // b absent → last
    expect(sortRoutes(routes, 'nearest', { nearKm }).map((r) => r.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('most-ridden uses the ridden score, descending', () => {
    const riddenScore = new Map([
      ['a', 1],
      ['b', 9],
      ['c', 4],
    ]);
    expect(
      sortRoutes(routes, 'most-ridden', { riddenScore }).map((r) => r.id)
    ).toEqual(['b', 'c', 'a']);
  });

  it('flattest / hilliest by elevation, no-elevation routes last in both', () => {
    expect(sortRoutes(routes, 'flattest').map((r) => r.id)).toEqual([
      'c', // 300
      'a', // 900
      'b', // none → last
    ]);
    expect(sortRoutes(routes, 'hilliest').map((r) => r.id)).toEqual([
      'a', // 900
      'c', // 300
      'b', // none → last
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [...routes];
    sortRoutes(input, 'distance-asc');
    expect(input.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('SORT_OPTIONS', () => {
  it('lists the seven keys in menu order with the elevation group flagged', () => {
    expect(SORT_OPTIONS.map((o) => o.key)).toEqual([
      'nearest',
      'distance-asc',
      'distance-desc',
      'name-az',
      'most-ridden',
      'flattest',
      'hilliest',
    ]);
    expect(SORT_OPTIONS.find((o) => o.key === 'nearest')!.needsSearch).toBe(
      true
    );
    expect(
      SORT_OPTIONS.filter((o) => o.needsElevation).map((o) => o.key)
    ).toEqual(['flattest', 'hilliest']);
  });

  it('isSortKey guards unknown values', () => {
    expect(isSortKey('distance-asc')).toBe(true);
    expect(isSortKey('bogus')).toBe(false);
  });
});

describe('sort resolution', () => {
  it('a search switches an auto sort to nearest first', () => {
    expect(sortOnSearch(INITIAL_SORT)).toEqual({
      sort: 'nearest',
      chose: false,
    });
  });

  it('a search does NOT override a sort the rider chose', () => {
    const chosen = sortOnPick('distance-desc');
    expect(sortOnSearch(chosen)).toEqual(chosen);
  });

  it('clearing search falls back to name A–Z only when the rider never chose', () => {
    expect(sortOnClear({ sort: 'nearest', chose: false })).toEqual(
      INITIAL_SORT
    );
    // a chosen non-nearest sort survives clearing
    const chosen = sortOnPick('most-ridden');
    expect(sortOnClear(chosen)).toEqual(chosen);
  });

  it('clearing forgets a now-invalid nearest even if the rider picked it', () => {
    expect(sortOnClear({ sort: 'nearest', chose: true })).toEqual(INITIAL_SORT);
  });

  it('picking a sort marks it as chosen', () => {
    expect(sortOnPick('flattest')).toEqual({ sort: 'flattest', chose: true });
  });
});
