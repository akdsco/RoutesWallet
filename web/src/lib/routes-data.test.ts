import { describe, it, expect, vi, afterEach } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { featuresToRoutes, loadRoutes } from './routes-data.ts';

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

  it('maps elevation_gain_m and owner fields when present', () => {
    const withElev = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'e',
            name: 'E',
            link: 'https://e/e',
            source: 'club-verified',
            elevation_gain_m: 388,
            owner_name: 'Alex Booker',
            owner_strava_id: '39587126',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0, 100],
              [2, 2, 150],
            ],
          },
        },
      ],
    } as unknown as FeatureCollection;
    expect(featuresToRoutes(withElev)[0]).toMatchObject({
      elevation_gain_m: 388,
      owner_name: 'Alex Booker',
      owner_strava_id: '39587126',
    });
  });

  it('leaves elevation/owner undefined when absent, without crashing', () => {
    const r = featuresToRoutes(fc)[0]!;
    expect(r.elevation_gain_m).toBeUndefined();
    expect(r.owner_name).toBeUndefined();
    expect(r.owner_strava_id).toBeUndefined();
  });

  it('treats empty-string owner fields as undefined, not a defined ""', () => {
    const empty = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'o',
            name: 'O',
            link: 'https://e/o',
            owner_name: '',
            owner_strava_id: '',
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
    const r = featuresToRoutes(empty)[0]!;
    expect(r.owner_name).toBeUndefined();
    expect(r.owner_strava_id).toBeUndefined();
  });

  it('preserves 3D [lng,lat,ele] geometry and centroids from the first two axes', () => {
    const threeD = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'z', name: 'Z', link: 'https://e/z' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0, 100],
              [2, 2, 200],
            ],
          },
        },
      ],
    } as unknown as FeatureCollection;
    const route = featuresToRoutes(threeD)[0]!;
    expect(route.geometry.coordinates).toEqual([
      [0, 0, 100],
      [2, 2, 200],
    ]);
    expect(route.centroid).toEqual([1, 1]);
  });

  it('maps country and region from the feature', () => {
    const withCR = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'cr',
            name: 'CR',
            link: 'https://e/cr',
            country: 'United Kingdom',
            region: 'Essex',
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
    expect(featuresToRoutes(withCR)[0]).toMatchObject({
      country: 'United Kingdom',
      region: 'Essex',
    });
  });

  it('carries an explicit null region/country without inventing values', () => {
    const overseas = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'es',
            name: 'Girona',
            link: 'https://e/es',
            country: 'Spain',
            region: null,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.8, 41.9],
              [2.9, 42.0],
            ],
          },
        },
      ],
    } as unknown as FeatureCollection;
    const r = featuresToRoutes(overseas)[0]!;
    expect(r.country).toBe('Spain');
    expect(r.region).toBeNull();
  });

  it('coerces a missing/empty country and region to null (never "" or "Other")', () => {
    // fc's route "a" carries neither country nor region.
    const r = featuresToRoutes(fc)[0]!;
    expect(r.country).toBeNull();
    expect(r.region).toBeNull();
    expect(r.region).not.toBe('');
    expect(r.region).not.toBe('Other');
  });

  it('maps a club-member source tier (member-contributed routes)', () => {
    const member = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'm',
            name: 'M',
            link: 'https://e/m',
            source: 'club-member',
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
    expect(featuresToRoutes(member)[0]!.source).toBe('club-member');
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

describe('loadRoutes', () => {
  afterEach(() => vi.unstubAllGlobals());

  // The live source is the shared member pool served by the /api/routes Function,
  // not the baked-in file — /routes.geojson survives only as the D1 seed source.
  it('reads the shared pool from /api/routes by default', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(fc) });
    vi.stubGlobal('fetch', fetchMock);

    const routes = await loadRoutes();

    expect(fetchMock).toHaveBeenCalledWith('/api/routes');
    expect(routes.map((r) => r.id)).toEqual(['a']);
  });

  it('throws loudly (never silently empty) on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );
    await expect(loadRoutes()).rejects.toThrow(/503/);
  });
});
