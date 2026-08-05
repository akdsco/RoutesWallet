import { describe, it, expect } from 'vitest';
import pointToLineDistance from '@turf/point-to-line-distance';
import { lineString, point } from '@turf/helpers';

// Scaffold-verification test: proves the Turf + Vitest toolchain is wired before
// the real near-X filter is built on top of it (see plan increment 4).
describe('geo toolchain', () => {
  it('computes point-to-line distance in kilometres', () => {
    // Line along the equator from (0,0) to (2,0); point ~0.9deg latitude north of it.
    const line = lineString([
      [0, 0],
      [2, 0],
    ]);
    const p = point([1, 0.9]);

    const km = pointToLineDistance(p, line, { units: 'kilometers' });

    // ~0.9deg of latitude is ~100 km.
    expect(km).toBeGreaterThan(95);
    expect(km).toBeLessThan(105);
  });
});
