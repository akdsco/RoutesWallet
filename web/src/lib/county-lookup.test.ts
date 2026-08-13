import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { makeCountyOf } from './county-lookup.ts';

/** Two unit squares, canonical names on `properties.name`. */
const boundaries: FeatureCollection<Polygon | MultiPolygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Alpha' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Beta' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [2, 3],
            [3, 3],
            [3, 2],
            [2, 2],
          ],
        ],
      },
    },
    // no name → must be ignored, never returned
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [5, 5],
            [5, 6],
            [6, 6],
            [6, 5],
            [5, 5],
          ],
        ],
      },
    },
  ],
};

describe('makeCountyOf', () => {
  const countyOf = makeCountyOf(boundaries);

  it('returns the canonical name of the polygon a point falls inside', () => {
    expect(countyOf(0.5, 0.5)).toBe('Alpha');
    expect(countyOf(2.5, 2.5)).toBe('Beta');
  });

  it('returns null for a point outside every polygon', () => {
    expect(countyOf(10, 10)).toBeNull();
  });

  it('never returns a name for a nameless polygon', () => {
    expect(countyOf(5.5, 5.5)).toBeNull();
  });
});
