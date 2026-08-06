import { describe, it, expect } from 'vitest';
import { routeThumbnail } from './thumbnail.ts';

describe('routeThumbnail', () => {
  it('fits every point inside the box', () => {
    const coords = [
      [2.0, 41.0],
      [2.5, 41.5],
      [3.0, 41.2],
    ];
    const pts = routeThumbnail(coords, 52, 36, 4);
    const nums = pts.split(' ').map((pair) => pair.split(',').map(Number));
    for (const [x, y] of nums) {
      expect(x!).toBeGreaterThanOrEqual(0);
      expect(x!).toBeLessThanOrEqual(52);
      expect(y!).toBeGreaterThanOrEqual(0);
      expect(y!).toBeLessThanOrEqual(36);
    }
  });

  it('flips latitude so north is up (smaller y for higher lat)', () => {
    // Two points, same lng; second is further north (higher lat).
    const pts = routeThumbnail(
      [
        [0, 0],
        [0, 1],
      ],
      52,
      36,
      4
    );
    const [, second] = pts
      .split(' ')
      .map((pair) => pair.split(',').map(Number));
    const first = pts.split(' ')[0]!.split(',').map(Number);
    // higher-lat point should have the smaller y (nearer the top)
    expect(second![1]!).toBeLessThan(first[1]!);
  });

  it('produces a finite in-box point when the line is degenerate', () => {
    const pts = routeThumbnail([[5, 5]], 52, 36, 4);
    const [x, y] = pts.split(',').map(Number);
    expect(Number.isFinite(x!)).toBe(true);
    expect(Number.isFinite(y!)).toBe(true);
    expect(x!).toBeGreaterThanOrEqual(0);
    expect(x!).toBeLessThanOrEqual(52);
    expect(y!).toBeGreaterThanOrEqual(0);
    expect(y!).toBeLessThanOrEqual(36);
  });
});
