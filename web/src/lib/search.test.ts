import { describe, it, expect } from 'vitest';
import { routesNear, distanceToRouteKm } from './search.ts';
import type { Route } from '../types.ts';

function route(id: string, coords: [number, number][]): Route {
  return {
    id,
    name: id,
    link: `https://example.com/${id}`,
    distance_km: 10,
    source: 'HV-signed',
    geometry: { type: 'LineString', coordinates: coords },
    centroid: coords[0]!,
  };
}

// A short line through central London (~[-0.09, 51.51]).
const london = route('london', [
  [-0.1, 51.51],
  [-0.08, 51.51],
]);
// A short line near Cambridge (~[0.12, 52.2]), ~80km north of London.
const cambridge = route('cambridge', [
  [0.11, 52.2],
  [0.13, 52.2],
]);
// A line up in the Scottish Highlands, far from everything.
const highlands = route('highlands', [
  [-4.2, 57.5],
  [-4.1, 57.5],
]);

describe('distanceToRouteKm', () => {
  it('is ~0 when the point sits on the route line', () => {
    expect(distanceToRouteKm([-0.09, 51.51], london)).toBeLessThan(1);
  });

  it('grows with distance from the line', () => {
    const near = distanceToRouteKm([-0.09, 51.6], london);
    const far = distanceToRouteKm([-0.09, 52.0], london);
    expect(far).toBeGreaterThan(near);
  });
});

describe('routesNear', () => {
  const all = [highlands, cambridge, london];

  it('returns only routes whose line passes within the radius', () => {
    const near = routesNear([-0.09, 51.51], all, 25);
    expect(near.map((r) => r.id)).toEqual(['london']);
  });

  it('sorts matches nearest-first', () => {
    // A point just north of London: London is closest, Cambridge next, Highlands excluded.
    const near = routesNear([-0.05, 51.7], all, 100);
    expect(near.map((r) => r.id)).toEqual(['london', 'cambridge']);
  });

  it('returns an empty array when nothing is in range', () => {
    expect(
      routesNear([-0.09, 51.51], all, 5).filter((r) => r.id !== 'london')
    ).toEqual([]);
    expect(routesNear([10, 10], all, 25)).toEqual([]);
  });
});
