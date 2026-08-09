import { describe, it, expect } from 'vitest';
import {
  buildHeatIndex,
  cellSizeForZoom,
  heatTierIndex,
  HEAT_RAMP,
  LEGEND_HEAT_STOPS,
} from './heat.ts';
import type { Route } from '../types.ts';

function route(id: string, coords: [number, number][]): Route {
  return {
    id,
    name: id,
    link: `https://example.com/${id}`,
    distance_km: 10,
    source: 'club-verified',
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

  it('counts an out-and-back segment once per route (no self-doubling)', () => {
    // Ride out along base, then back over the same cells.
    const outAndBack = route('a', [...base, ...[...base].reverse().slice(1)]);
    const segs = buildHeatIndex([outAndBack], 150);
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every((s) => s.count === 1)).toBe(true);
  });
});

describe('cellSizeForZoom', () => {
  it('coarsens as you zoom out', () => {
    expect(cellSizeForZoom(15)).toBeLessThan(cellSizeForZoom(12));
    expect(cellSizeForZoom(12)).toBeLessThan(cellSizeForZoom(9));
  });

  it('has the documented breakpoints (>=14 -> 25, >=11 -> 60, else 150)', () => {
    expect(cellSizeForZoom(14)).toBe(25);
    expect(cellSizeForZoom(13.9)).toBe(60);
    expect(cellSizeForZoom(11)).toBe(60);
    expect(cellSizeForZoom(10.9)).toBe(150);
    expect(cellSizeForZoom(5)).toBe(150);
  });
});

describe('heatTierIndex', () => {
  it('rises with overlap count and clamps at the hottest tier', () => {
    expect(heatTierIndex(9, 'light')).toBeGreaterThan(
      heatTierIndex(1, 'light')
    );
    expect(heatTierIndex(1, 'light')).toBe(0);
    expect(heatTierIndex(1000, 'light')).toBe(HEAT_RAMP.light.length - 1);
    expect(heatTierIndex(1000, 'dark')).toBe(HEAT_RAMP.dark.length - 1);
  });

  // Breakpoints are geometric doublings [1,2,4,8,16,∞], re-derived from the real
  // 125-route routes.geojson (TB-48). The old [1,2,3,5,8] set was tuned on
  // synthetic data peaking ~20; real counts run 1..~69 with a long tail, so the
  // old top tier lumped 9..69 into one colour. Doubling spreads the hot end so
  // each tier holds a decreasing share and the hottest colour is the true spine.
  it('maps counts onto the geometric tier boundaries [1,2,4,8,16]', () => {
    const cases: [number, number][] = [
      [1, 0], // lone lane
      [2, 1],
      [3, 2], // 3 falls in the <=4 tier
      [4, 2],
      [5, 3], // <=8
      [8, 3],
      [9, 4], // <=16
      [16, 4],
      [17, 5], // spine
    ];
    for (const [count, tier] of cases) {
      expect(heatTierIndex(count, 'light')).toBe(tier);
      expect(heatTierIndex(count, 'dark')).toBe(tier);
    }
  });

  it('the two ramps share the same breakpoints (grading is theme-agnostic)', () => {
    const maxes = (t: 'light' | 'dark') => HEAT_RAMP[t].map((x) => x.max);
    expect(maxes('light')).toEqual(maxes('dark'));
    expect(maxes('light')).toEqual([1, 2, 4, 8, 16, Infinity]);
  });
});

describe('LEGEND_HEAT_STOPS', () => {
  // TB-54: the legend's idle heat swatch must match the drawn ramp. The ends are
  // the source of truth — pin them so retuning HEAT_RAMP's faint/hot colour fails
  // here loudly instead of letting the legend silently drift from the map again.
  for (const theme of ['light', 'dark'] as const) {
    it(`${theme}: faint + hot stops equal the ramp's endpoints`, () => {
      const ramp = HEAT_RAMP[theme];
      expect(LEGEND_HEAT_STOPS[theme][0]).toBe(ramp[0]!.color);
      expect(LEGEND_HEAT_STOPS[theme][3]).toBe(ramp[ramp.length - 1]!.color);
    });
  }
});
