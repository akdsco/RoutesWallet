import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { stravaRouteToFeature, type StravaRouteInput } from './strava-route.ts';
import { featuresToRoutes } from './routes-data.ts';

const base: StravaRouteInput = {
  id_str: '1234567890',
  name: 'Surrey Hills Loop',
  distance: 82500, // metres
  elevation_gain: 1180.6, // metres
  map: { summary_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
  athlete: { id: 39587126, firstname: 'Alex', lastname: 'Booker' },
};

describe('stravaRouteToFeature', () => {
  it('maps a Strava route-list entry to a routes.geojson Feature', () => {
    const f = stravaRouteToFeature(base)!;
    expect(f.geometry.type).toBe('LineString');
    expect(f.geometry.coordinates.length).toBe(3);
    expect(f.properties).toMatchObject({
      id: '1234567890',
      name: 'Surrey Hills Loop',
      link: 'https://www.strava.com/routes/1234567890',
      source: 'club-member',
      owner_name: 'Alex Booker',
      owner_strava_id: '39587126',
    });
  });

  it('converts distance (m) to km and rounds elevation gain to whole metres', () => {
    const p = stravaRouteToFeature(base)!.properties;
    expect(p.distance_km).toBe(82.5);
    expect(p.elevation_gain_m).toBe(1181);
  });

  it('leaves country/region null for the normalise step to fill', () => {
    const p = stravaRouteToFeature(base)!.properties;
    expect(p.country).toBeNull();
    expect(p.region).toBeNull();
  });

  it('returns null when the route has no usable line (skip + count upstream)', () => {
    expect(
      stravaRouteToFeature({ ...base, map: { summary_polyline: '' } })
    ).toBeNull();
    expect(stravaRouteToFeature({ ...base, map: null })).toBeNull();
  });

  it('omits owner fields when the athlete name/id is absent', () => {
    const p = stravaRouteToFeature({
      ...base,
      athlete: { id: null, firstname: null, lastname: null },
    })!.properties;
    expect(p.owner_name).toBeUndefined();
    expect(p.owner_strava_id).toBeUndefined();
  });

  // The whole point of matching the on-disk shape: the produced feature must feed
  // the existing loader unchanged, landing as a club-member Route.
  it('round-trips through featuresToRoutes as a club-member Route', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [stravaRouteToFeature(base)!],
    };
    const routes = featuresToRoutes(fc);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      id: '1234567890',
      source: 'club-member',
      distance_km: 82.5,
      owner_strava_id: '39587126',
    });
    expect(routes[0]!.centroid).toHaveLength(2);
  });
});
