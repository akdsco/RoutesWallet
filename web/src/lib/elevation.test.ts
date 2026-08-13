import { describe, it, expect } from 'vitest';
import { elevationGainM } from './elevation.ts';

// Positions are [lng, lat, ele?]; only the 3rd axis matters for gain.
const at = (...eles: number[]): number[][] => eles.map((e, i) => [0, i, e]);

describe('elevationGainM', () => {
  it('is 0 for a flat series', () => {
    expect(elevationGainM(at(100, 100, 100, 100))).toBe(0);
  });

  it('equals total ascent for a monotone climb', () => {
    expect(elevationGainM(at(0, 10, 20, 30))).toBe(30);
  });

  it('rejects sub-threshold jitter (default 3 m band)', () => {
    // wobbles within ±3 m of the reference, never a real climb
    expect(elevationGainM(at(100, 101, 100, 102, 99, 100))).toBe(0);
  });

  it('counts a real climb through the noise', () => {
    // 8 m step is real; the ±1 m wobble before it is not
    expect(elevationGainM(at(100, 100.5, 101, 108))).toBe(8);
  });

  it('sums both climbs across a descent (no double counting)', () => {
    // up 50, down to 20, up 30 → 50 + 30 = 80
    expect(elevationGainM(at(0, 50, 20, 50))).toBe(80);
  });

  it('returns a whole-metre integer', () => {
    expect(Number.isInteger(elevationGainM(at(0, 1.4, 2.9, 6.6)))).toBe(true);
  });

  it('honours a custom threshold', () => {
    // 4 m sawtooth: a 5 m band treats every wobble as jitter (0); a 3 m band
    // banks each of the three up-swings (3 × 4 = 12).
    const sawtooth = at(0, 4, 0, 4, 0, 4);
    expect(elevationGainM(sawtooth, { threshold: 5 })).toBe(0);
    expect(elevationGainM(sawtooth, { threshold: 3 })).toBe(12);
  });

  it('is 0 when the series carries no elevation (2D coords)', () => {
    expect(
      elevationGainM([
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    ).toBe(0);
  });

  it('is 0 for a single point', () => {
    expect(elevationGainM(at(100))).toBe(0);
  });

  it('does not bank a climb across a gap in the ele series', () => {
    // A missing-elevation point breaks the run — the 300 m difference between the
    // two ends of the gap spans unknown terrain and must not be counted.
    const withGap: number[][] = [
      [0, 0, 100],
      [0, 1], // no elevation → gap
      [0, 2, 400],
    ];
    expect(elevationGainM(withGap)).toBe(0);
  });

  it('sums each side of a gap independently', () => {
    // climb 0→50, gap, climb 100→130 → 50 + 30 = 80 (not bridged as 130)
    const split: number[][] = [
      [0, 0, 0],
      [0, 1, 50],
      [0, 2], // gap
      [0, 3, 100],
      [0, 4, 130],
    ];
    expect(elevationGainM(split)).toBe(80);
  });
});
