import { describe, it, expect } from 'vitest';
import { heatSegments, heatStyle } from './heat.ts';
import type { Route } from '../types.ts';

function route(id: string, coords: [number, number][]): Route {
  return {
    id,
    name: id,
    link: `https://example.com/${id}`,
    distance_km: 10,
    source: 'HV-signed',
    region: 'Test',
    notes: '',
    cafe: '',
    geometry: { type: 'LineString', coordinates: coords },
    centroid: coords[0]!,
  };
}

describe('heatSegments', () => {
  it('counts a shared segment twice and unique segments once', () => {
    // Both routes share the segment (0,0)->(1,0); each has its own tail.
    const a = route('a', [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    const b = route('b', [
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    const segs = heatSegments([a, b]);
    const shared = segs.find(
      (s) => s.a[0] === 0 && s.a[1] === 0 && s.b[0] === 1 && s.b[1] === 0
    );
    expect(shared?.count).toBe(2);
    // three unique segments total: shared, (1,0)-(2,0), (1,0)-(1,1)
    expect(segs).toHaveLength(3);
    expect(segs.filter((s) => s.count === 1)).toHaveLength(2);
  });

  it('treats a segment as order-independent (A->B same as B->A)', () => {
    const a = route('a', [
      [0, 0],
      [1, 1],
    ]);
    const b = route('b', [
      [1, 1],
      [0, 0],
    ]);
    expect(heatSegments([a, b])).toHaveLength(1);
    expect(heatSegments([a, b])[0]!.count).toBe(2);
  });
});

describe('heatStyle', () => {
  it('deepens weight and opacity as the count rises', () => {
    const lone = heatStyle(1);
    const busy = heatStyle(9);
    expect(busy.weight).toBeGreaterThan(lone.weight);
    expect(busy.opacity).toBeGreaterThan(lone.opacity);
  });
});
