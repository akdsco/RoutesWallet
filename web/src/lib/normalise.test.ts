import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { normaliseFeatures } from './normalise.ts';
import type { CountyOf } from './region.ts';

// Fake resolver by longitude band: lng<0 → Greater London, [0,2) → Essex, else
// nowhere (overseas). Lets the majority vote outweigh a London start/finish.
const countyOf: CountyOf = (lng) =>
  lng < 0 ? 'Greater London' : lng < 2 ? 'Essex' : null;

function sampleFc(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        // Starts + ends in "Greater London" but rides through "Essex":
        // votes [GL, Essex, Essex, Essex, GL] → Essex wins 3–2.
        type: 'Feature',
        properties: { id: 'a', name: 'A ride', region: 'Herts' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-0.1, 51.5],
            [0.5, 51.7],
            [0.6, 51.8],
            [0.7, 51.9],
            [-0.1, 51.5],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'b',
          name: 'Girona - 70km',
          region: 'Hub Velo trips',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [2.8, 41.9],
            [2.9, 42.0],
          ],
        },
      },
      {
        // non-LineString: passed through untouched
        type: 'Feature',
        properties: { id: 'p', name: 'point' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ],
  };
}

describe('normaliseFeatures', () => {
  it('sets country + region from the start point (geometry-first)', () => {
    const { fc } = normaliseFeatures(sampleFc(), countyOf);
    const [a, b] = fc.features;
    expect(a!.properties).toMatchObject({
      country: 'United Kingdom',
      region: 'Essex',
    });
    expect(b!.properties).toMatchObject({ country: 'Spain', region: null });
  });

  it('never writes an empty-string region', () => {
    const { fc } = normaliseFeatures(sampleFc(), countyOf);
    for (const f of fc.features) {
      expect(f.properties?.region).not.toBe('');
    }
  });

  it('reports before→after mismatches against the old label', () => {
    const { report } = normaliseFeatures(sampleFc(), countyOf);
    expect(report.total).toBe(2); // two LineStrings; the Point is skipped
    expect(report.byRegion.Essex).toBe(1);
    expect(report.byRegion['(null)']).toBe(1);
    expect(report.byCountry['United Kingdom']).toBe(1);
    expect(report.byCountry.Spain).toBe(1);
    // both changed away from their informal labels
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'a', was: 'Herts', now: 'Essex' }),
        expect.objectContaining({ id: 'b', was: 'Hub Velo trips', now: null }),
      ])
    );
  });

  it('leaves non-LineString features untouched', () => {
    const { fc } = normaliseFeatures(sampleFc(), countyOf);
    const p = fc.features[2]!;
    expect(p.properties).toEqual({ id: 'p', name: 'point' });
  });

  it('is idempotent — a second run reproduces the same country/region', () => {
    const once = normaliseFeatures(sampleFc(), countyOf).fc;
    const twice = normaliseFeatures(once, countyOf).fc;
    const key = (fc: FeatureCollection) =>
      fc.features.map((f): [unknown, unknown] => [
        f.properties?.country,
        f.properties?.region,
      ]);
    expect(key(twice)).toEqual(key(once));
    // and the second run flags no mismatches (labels already canonical)
    expect(normaliseFeatures(once, countyOf).report.mismatches).toEqual([]);
  });
});
