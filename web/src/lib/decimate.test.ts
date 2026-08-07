import { describe, it, expect } from 'vitest';
import { decimate } from './decimate.ts';

describe('decimate', () => {
  it('returns a copy unchanged when already within maxPts', () => {
    const pts = [1, 2, 3];
    const out = decimate(pts, 5);
    expect(out).toEqual(pts);
    expect(out).not.toBe(pts); // a copy, not the same reference
  });

  it('caps the length at maxPts + 1 (stride points plus the last)', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => i);
    const out = decimate(pts, 160);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.length).toBeGreaterThan(1);
  });

  it('always keeps the first and last point', () => {
    const pts = Array.from({ length: 2534 }, (_, i) => i);
    const out = decimate(pts, 160);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(2533);
  });

  it('appends the last point when the stride would skip it', () => {
    // 0..99, stride = ceil(100/10) = 10 -> 0,10,...,90 then 99 appended
    const out = decimate(Array.from({ length: 100 }, (_, i) => i), 10);
    expect(out[out.length - 1]).toBe(99);
    expect(out[out.length - 2]).toBe(90);
  });

  it('does not duplicate the last point when the stride already lands on it', () => {
    // length 11, stride = ceil(11/6) = 2 -> 0,2,4,6,8,10 ; 10 is already last
    const out = decimate(Array.from({ length: 11 }, (_, i) => i), 6);
    expect(out[out.length - 1]).toBe(10);
    expect(out.filter((n) => n === 10).length).toBe(1);
  });

  it('preserves relative order', () => {
    const out = decimate(Array.from({ length: 500 }, (_, i) => i), 50);
    for (let i = 1; i < out.length; i++) expect(out[i]!).toBeGreaterThan(out[i - 1]!);
  });

  it('throws if maxPts < 2 (a line needs at least its endpoints)', () => {
    expect(() => decimate([1, 2, 3], 1)).toThrow();
  });
});
