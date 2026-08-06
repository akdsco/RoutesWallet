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
        source: 'HV-signed',
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
      source: 'HV-signed',
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
});
