import { describe, it, expect } from 'vitest';
import { buildHeatIndex, heatStyle, cellSizeForZoom } from './heat.ts';
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

// A line heading east along lat 51.5, long enough to cross several 150 m cells.
const base: [number, number][] = [
  [0.0, 51.5],
  [0.004, 51.5],
  [0.008, 51.5],
];
// ~8 m north — GPS scatter that must NOT stop the two traces sharing cells.
const jittered: [number, number][] = base.map(([lng, lat]) => [
  lng,
  lat + 0.00007,
]);

describe('buildHeatIndex', () => {
  it('counts scattered traces of the same lane as a shared corridor', () => {
    // The whole point of grid quantization: raw-coordinate keying would give 1.
    const segs = buildHeatIndex([route('a', base), route('b', jittered)], 150);
    expect(segs.some((s) => s.count === 2)).toBe(true);
  });

  it('keeps a lone lane at count 1', () => {
    const segs = buildHeatIndex([route('a', base)], 150);
    expect(segs.every((s) => s.count === 1)).toBe(true);
    expect(segs.length).toBeGreaterThan(0);
  });

  it('is direction-independent (a->b same as b->a)', () => {
    const fwd = route('a', base);
    const rev = route('b', [...base].reverse());
    const segs = buildHeatIndex([fwd, rev], 150);
    expect(segs.every((s) => s.count === 2)).toBe(true);
  });

  it('separates lanes at a finer cell size that a coarse one merges', () => {
    // Two lanes ~40 m apart: merged at 150 m, distinct at 25 m.
    const north = route('n', base);
    const south = route(
      's',
      base.map(([lng, lat]) => [lng, lat - 0.0004])
    );
    const coarse = buildHeatIndex([north, south], 150);
    const fine = buildHeatIndex([north, south], 25);
    expect(coarse.some((s) => s.count === 2)).toBe(true);
    expect(fine.every((s) => s.count === 1)).toBe(true);
  });
});

describe('cellSizeForZoom', () => {
  it('coarsens as you zoom out', () => {
    expect(cellSizeForZoom(15)).toBeLessThan(cellSizeForZoom(12));
    expect(cellSizeForZoom(12)).toBeLessThan(cellSizeForZoom(9));
  });
});

describe('heatStyle', () => {
  it('deepens weight and opacity as the count rises', () => {
    expect(heatStyle(9).weight).toBeGreaterThan(heatStyle(1).weight);
    expect(heatStyle(9).opacity).toBeGreaterThan(heatStyle(1).opacity);
  });
});
