import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { featuresToRoutes } from './routes-data.ts';

const fc: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'a',
        name: 'Route A',
        link: 'https://example.com/a',
        distance_km: 30,
        source: 'club-verified',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [2, 2],
        ],
      },
    },
    {
      // A non-LineString feature should be ignored.
      type: 'Feature',
      properties: { id: 'skip' },
      geometry: { type: 'Point', coordinates: [1, 1] },
    },
  ],
};

describe('featuresToRoutes', () => {
  it('maps LineString features to the Route contract', () => {
    const routes = featuresToRoutes(fc);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      id: 'a',
      name: 'Route A',
      link: 'https://example.com/a',
      distance_km: 30,
      source: 'club-verified',
    });
    expect(routes[0]!.geometry.coordinates).toEqual([
      [0, 0],
      [2, 2],
    ]);
  });

  it('computes the centroid as the mean of the coordinates', () => {
    expect(featuresToRoutes(fc)[0]!.centroid).toEqual([1, 1]);
  });

  it('ignores non-LineString features', () => {
    expect(featuresToRoutes(fc).map((r) => r.id)).not.toContain('skip');
  });

  // The data is CDN-served and outside the type system — one bad feature must
  // never crash the app or wipe the good routes.
  it('skips malformed features without throwing, keeping the good ones', () => {
    const dirty = {
      type: 'FeatureCollection',
      features: [
        fc.features[0], // good
        {
          type: 'Feature',
          properties: null,
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        }, // null props
        {
          type: 'Feature',
          properties: { id: 'b', name: 'B' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        }, // missing link
        {
          type: 'Feature',
          properties: { id: 'c', name: 'C', link: 'x' },
          geometry: { type: 'LineString', coordinates: [[0, 0]] },
        }, // <2 points
      ],
    } as unknown as FeatureCollection;
    let routes: ReturnType<typeof featuresToRoutes> = [];
    expect(() => {
      routes = featuresToRoutes(dirty);
    }).not.toThrow();
    expect(routes.map((r) => r.id)).toEqual(['a']);
  });

  it('coerces an unknown source to the least-trusted tier', () => {
    const odd = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'x',
            name: 'X',
            link: 'https://e/x',
            source: 'HV-signed',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      ],
    } as unknown as FeatureCollection;
    expect(featuresToRoutes(odd)[0]!.source).toBe('third-party');
  });
});
