import { describe, it, expect } from 'vitest';
import {
  decodePolyline,
  decodePolyline6,
  isEligibleForMatch,
  GRAVEL_NAME_EXCLUSIONS,
  acceptMatch,
  dedupeAndNormalize,
  chunkTrace,
  stitchChunks,
  chunkWithMargins,
  coreFromMatch,
  maxStrayMeters,
} from './mapMatch';

describe('decodePolyline', () => {
  // The canonical Google/Mapbox polyline reference vector (precision 5).
  // Documented decode (as [lat, lng]):
  //   [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]
  // We return [lng, lat] to match GeoJSON coordinate order.
  it('decodes the canonical precision-5 reference vector to [lng, lat]', () => {
    const out = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(out).toHaveLength(3);
    expect(out[0]![0]).toBeCloseTo(-120.2, 5);
    expect(out[0]![1]).toBeCloseTo(38.5, 5);
    expect(out[1]![0]).toBeCloseTo(-120.95, 5);
    expect(out[1]![1]).toBeCloseTo(40.7, 5);
    expect(out[2]![0]).toBeCloseTo(-126.453, 5);
    expect(out[2]![1]).toBeCloseTo(43.252, 5);
  });

  it('returns [] for an empty string', () => {
    expect(decodePolyline('', 6)).toEqual([]);
  });

  it('decodePolyline6 uses precision 6 (Valhalla shapes)', () => {
    // Same delta bytes, but precision 6 => coordinates 10x smaller than precision 5.
    const p5 = decodePolyline('_p~iF~ps|U', 5);
    const p6 = decodePolyline6('_p~iF~ps|U');
    expect(p6[0]![1]).toBeCloseTo(p5[0]![1] / 10, 6);
    expect(p6[0]![0]).toBeCloseTo(p5[0]![0] / 10, 6);
  });
});

describe('isEligibleForMatch', () => {
  it('accepts a plain Road route', () => {
    expect(
      isEligibleForMatch({ name: 'Cold Christmas 125km', route_type: 'Road' })
    ).toBe(true);
  });

  it('rejects Gravel-tagged routes', () => {
    expect(
      isEligibleForMatch({
        name: 'HVCC Strade ’24 GRAVEL Corta',
        route_type: 'Gravel',
      })
    ).toBe(false);
  });

  it('rejects untyped (empty / missing) routes — in doubt, leave', () => {
    expect(
      isEligibleForMatch({ name: 'Some member ride', route_type: '' })
    ).toBe(false);
    expect(isEligibleForMatch({ name: 'Some member ride' })).toBe(false);
  });

  it('rejects the named Road-tagged off-road routes (the 2 that hide in the Road set)', () => {
    for (const name of GRAVEL_NAME_EXCLUSIONS) {
      expect(isEligibleForMatch({ name, route_type: 'Road' })).toBe(false);
    }
    // sanity: both known offenders are covered
    expect(GRAVEL_NAME_EXCLUSIONS).toContain('Strade Bambini - 70km');
    expect(GRAVEL_NAME_EXCLUSIONS).toContain(
      'Blackmore 80km (with gravel section)'
    );
  });
});

describe('acceptMatch', () => {
  it('accepts a full-coverage match with a small length deviation', () => {
    expect(
      acceptMatch({ rawKm: 100, matchedKm: 101, coveredFraction: 1 }).ok
    ).toBe(true);
  });

  it('rejects a partial match (trace not fully covered)', () => {
    const r = acceptMatch({ rawKm: 100, matchedKm: 60, coveredFraction: 0.6 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/coverage/i);
  });

  it('rejects a full-coverage match whose length deviates too far (bad snap / detour)', () => {
    const r = acceptMatch({ rawKm: 100, matchedKm: 140, coveredFraction: 1 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/deviat/i);
  });

  it('honours custom thresholds', () => {
    // Tighter deviation gate flips an otherwise-accepted match.
    expect(
      acceptMatch(
        { rawKm: 100, matchedKm: 108, coveredFraction: 1 },
        { maxDeviation: 0.05 }
      ).ok
    ).toBe(false);
    // Looser coverage gate accepts a slightly-short trace.
    expect(
      acceptMatch(
        { rawKm: 100, matchedKm: 99, coveredFraction: 0.95 },
        { minCoverage: 0.9 }
      ).ok
    ).toBe(true);
  });
});

describe('dedupeAndNormalize', () => {
  it('normalises coordinates to 6 decimal places', () => {
    const out = dedupeAndNormalize([[[-0.123456789, 51.987654321]]]);
    expect(out).toEqual([[-0.123457, 51.987654]]);
  });

  it('joins legs and drops the duplicated seam point between them', () => {
    const legA: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 2],
    ];
    const legB: [number, number][] = [
      [2, 2], // seam — same as legA's last point
      [3, 3],
    ];
    expect(dedupeAndNormalize([legA, legB])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it('keeps a non-duplicate leg boundary (small gap is preserved, not merged)', () => {
    const legA: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    const legB: [number, number][] = [
      [1.5, 1.5],
      [2, 2],
    ];
    expect(dedupeAndNormalize([legA, legB])).toEqual([
      [0, 0],
      [1, 1],
      [1.5, 1.5],
      [2, 2],
    ]);
  });

  it('returns [] for empty input', () => {
    expect(dedupeAndNormalize([])).toEqual([]);
    expect(dedupeAndNormalize([[]])).toEqual([]);
  });
});

describe('chunkTrace', () => {
  const coords = (n: number): [number, number][] =>
    Array.from({ length: n }, (_, i) => [i, i] as [number, number]);

  it('returns a single chunk when the trace fits in one', () => {
    const c = coords(5);
    expect(chunkTrace(c, 5)).toEqual([c]);
    expect(chunkTrace(c, 10)).toEqual([c]);
  });

  it('splits into chunks that SHARE a boundary point (so matches meet at seams)', () => {
    // 5 points, size 3 => [0,1,2] and [2,3,4] — point 2 is shared.
    const out = chunkTrace(coords(5), 3);
    expect(out).toEqual([
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        [2, 2],
        [3, 3],
        [4, 4],
      ],
    ]);
  });

  it('covers every point across the chunks (nothing dropped)', () => {
    const c = coords(2015);
    const out = chunkTrace(c, 200);
    // reconstruct by concatenating chunks and dropping the shared seam point
    const rebuilt: [number, number][] = [];
    for (const chunk of out) {
      for (let i = 0; i < chunk.length; i++) {
        if (i === 0 && rebuilt.length) continue;
        rebuilt.push(chunk[i]!);
      }
    }
    expect(rebuilt).toEqual(c);
    expect(out.length).toBe(Math.ceil((c.length - 1) / (200 - 1)));
  });

  it('throws for size < 2', () => {
    expect(() => chunkTrace(coords(5), 1)).toThrow();
  });
});

describe('stitchChunks', () => {
  it('drops the duplicated seam point between chunks (exact)', () => {
    const a: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    const b: [number, number][] = [
      [1, 1],
      [2, 2],
    ];
    expect(stitchChunks([a, b])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it('drops a near-duplicate seam point within epsilon (two independent matches)', () => {
    const a: [number, number][] = [
      [0, 0],
      [1.000001, 1.000001],
    ];
    const b: [number, number][] = [
      [1.000002, 1.000002], // ~within epsilon of a's last point
      [2, 2],
    ];
    expect(stitchChunks([a, b], 1e-4)).toEqual([
      [0, 0],
      [1.000001, 1.000001],
      [2, 2],
    ]);
  });

  it('keeps a genuine gap at the seam (beyond epsilon — e.g. a raw-fallback chunk)', () => {
    const a: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    const b: [number, number][] = [
      [1.01, 1.01], // a real jog, not a duplicate
      [2, 2],
    ];
    expect(stitchChunks([a, b], 1e-4)).toEqual([
      [0, 0],
      [1, 1],
      [1.01, 1.01],
      [2, 2],
    ]);
  });

  it('never dedupes interior points, only the seam', () => {
    const a: [number, number][] = [
      [0, 0],
      [0, 0], // interior exact dup is left as-is (full resolution preserved)
      [1, 1],
    ];
    expect(stitchChunks([a])).toEqual([
      [0, 0],
      [0, 0],
      [1, 1],
    ]);
  });
});

describe('chunkWithMargins', () => {
  const coords = (n: number): [number, number][] =>
    Array.from({ length: n }, (_, i) => [i, i] as [number, number]);

  it('returns one full-range chunk when the trace fits in the core', () => {
    const c = coords(5);
    expect(chunkWithMargins(c, 300, 80)).toEqual([
      { input: c, coreStart: 0, coreEnd: 4 },
    ]);
  });

  it('cores tile the whole trace with no overlap and no gap', () => {
    const c = coords(1000);
    const chunks = chunkWithMargins(c, 300, 80);
    // reconstruct by concatenating each chunk's core slice
    const rebuilt: [number, number][] = [];
    for (const ch of chunks) {
      rebuilt.push(...ch.input.slice(ch.coreStart, ch.coreEnd + 1));
    }
    expect(rebuilt).toEqual(c);
  });

  it('adds a context margin on both sides where the trace allows', () => {
    const c = coords(1000);
    const chunks = chunkWithMargins(c, 300, 80);
    // first chunk: no left margin, right margin present
    expect(chunks[0]!.coreStart).toBe(0);
    expect(chunks[0]!.input.length).toBe(300 + 80);
    // a middle chunk: margin on both sides
    expect(chunks[1]!.coreStart).toBe(80);
    expect(chunks[1]!.input.length).toBe(80 + 300 + 80);
  });

  it('throws for core < 2', () => {
    expect(() => chunkWithMargins(coords(10), 1, 5)).toThrow();
  });
});

describe('coreFromMatch', () => {
  // A straight matched road shape from lng 0..10 (11 dense points).
  const shape = (): [number, number][] =>
    Array.from({ length: 11 }, (_, i) => [i, 0] as [number, number]);

  it('returns the shape slice between the snapped core-start and core-end', () => {
    const matched: ([number, number] | null)[] = [
      [0, 0],
      [2, 0], // coreStart
      [5, 0],
      [8, 0], // coreEnd
      [10, 0],
    ];
    // core is input indices 1..3 => snapped [2,0]..[8,0] => shape[2..8]
    expect(coreFromMatch(shape(), matched, 1, 3)).toEqual([
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
      [6, 0],
      [7, 0],
      [8, 0],
    ]);
  });

  it('skips inward past unmatched points at the core boundary', () => {
    const matched: ([number, number] | null)[] = [null, [3, 0], [6, 0], null];
    // coreStart 0 is unmatched -> use idx1 [3,0]; coreEnd 3 unmatched -> use idx2 [6,0]
    expect(coreFromMatch(shape(), matched, 0, 3)).toEqual([
      [3, 0],
      [4, 0],
      [5, 0],
      [6, 0],
    ]);
  });

  it('returns [] when no core point matched', () => {
    expect(coreFromMatch(shape(), [null, null, null], 0, 2)).toEqual([]);
    expect(coreFromMatch([], [[0, 0]], 0, 0)).toEqual([]);
  });
});

describe('maxStrayMeters', () => {
  it('is ~0 when the matched line equals the raw line', () => {
    const line: [number, number][] = [
      [0, 51],
      [0.001, 51],
      [0.002, 51],
    ];
    expect(maxStrayMeters(line, line)).toBeLessThan(1);
  });

  it('reports a large stray when the matched line jumps to a parallel road', () => {
    const raw: [number, number][] = [
      [0, 51],
      [0.001, 51],
      [0.002, 51],
    ];
    // ~0.001 deg latitude north ~= 111 m off the raw line
    const strayed: [number, number][] = [[0.001, 51.001]];
    const d = maxStrayMeters(strayed, raw);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(140);
  });
});
