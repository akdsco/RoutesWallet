import { describe, it, expect } from 'vitest';
import type { Feature, LineString } from 'geojson';
import { enrichFeatureFromGpx } from './enrich.ts';

// A non-Strava feature as it sits in routes.geojson today: flat 2D geometry, no
// elevation/owner, but full curated metadata that must survive untouched.
const baseFeature = (): Feature<LineString> => ({
  type: 'Feature',
  properties: {
    id: 'rwgps-50433954',
    name: "Girona (Tia's favourite)",
    link: 'https://ridewithgps.com/routes/50433954',
    distance_km: 74,
    source: 'club-member',
    region: 'Hub Velo trips',
    notes: 'lovely',
    cafe: 'Rocacorba summit',
  },
  geometry: {
    type: 'LineString',
    coordinates: [
      [2.82056, 41.97871],
      [2.82073, 41.97889],
    ],
  },
});

// RideWithGPS-flavoured GPX: elevation, no author.
const RWGPS_GPX = `<gpx creator="http://ridewithgps.com/">
  <metadata><name>x</name></metadata>
  <trk><trkseg>
    <trkpt lat="41.97871" lon="2.82056"><ele>81</ele></trkpt>
    <trkpt lat="41.97889" lon="2.82073"><ele>120</ele></trkpt>
  </trkseg></trk>
</gpx>`;

// Strava-flavoured GPX: has an <author> block (owner path — also what TB-65 reuse
// will hit).
const AUTHORED_GPX = `<gpx creator="StravaGPX">
  <metadata><author><name>Tia ⓥ</name>
    <link href="https://www.strava.com/athletes/12345"/></author></metadata>
  <trk><trkseg>
    <trkpt lat="41.97871" lon="2.82056"><ele>81</ele></trkpt>
    <trkpt lat="41.97889" lon="2.82073"><ele>120</ele></trkpt>
  </trkseg></trk>
</gpx>`;

describe('enrichFeatureFromGpx', () => {
  it('adds 3D geometry and a computed gain from the ele-series', () => {
    const out = enrichFeatureFromGpx(baseFeature(), RWGPS_GPX);
    expect(out.geometry.coordinates).toEqual([
      [2.82056, 41.97871, 81],
      [2.82073, 41.97889, 120],
    ]);
    expect(out.properties?.elevation_gain_m).toBe(39);
  });

  it('sets owner from an <author> block when present', () => {
    const out = enrichFeatureFromGpx(baseFeature(), AUTHORED_GPX);
    expect(out.properties?.owner_name).toBe('Tia');
    expect(out.properties?.owner_strava_id).toBe('12345');
  });

  it('leaves owner absent when the GPX has no author (RWGPS/Garmin)', () => {
    const out = enrichFeatureFromGpx(baseFeature(), RWGPS_GPX);
    expect(out.properties).not.toHaveProperty('owner_name');
    expect(out.properties).not.toHaveProperty('owner_strava_id');
  });

  it('preserves all curated metadata untouched', () => {
    const out = enrichFeatureFromGpx(baseFeature(), RWGPS_GPX);
    expect(out.properties).toMatchObject({
      id: 'rwgps-50433954',
      name: "Girona (Tia's favourite)",
      link: 'https://ridewithgps.com/routes/50433954',
      distance_km: 74,
      source: 'club-member',
      region: 'Hub Velo trips',
      notes: 'lovely',
      cafe: 'Rocacorba summit',
    });
  });

  it('is idempotent — re-enriching yields an identical feature', () => {
    const once = enrichFeatureFromGpx(baseFeature(), RWGPS_GPX);
    const twice = enrichFeatureFromGpx(once, RWGPS_GPX);
    expect(twice).toEqual(once);
  });

  it('does not mutate the input feature', () => {
    const f = baseFeature();
    enrichFeatureFromGpx(f, RWGPS_GPX);
    expect(f.geometry.coordinates[0]).toEqual([2.82056, 41.97871]);
    expect(f.properties).not.toHaveProperty('elevation_gain_m');
  });

  it('throws on a GPX with fewer than two trackpoints', () => {
    const thin = `<gpx><trk><trkseg>
      <trkpt lat="41.9" lon="2.8"><ele>81</ele></trkpt>
    </trkseg></trk></gpx>`;
    expect(() => enrichFeatureFromGpx(baseFeature(), thin)).toThrow();
  });

  it('throws when the GPX has trackpoints but no elevation series', () => {
    // e.g. an elevation-stripped export — enriching it would silently store 2D
    // geometry + 0 m gain and report success, defeating the whole point.
    const noEle = `<gpx><trk><trkseg>
      <trkpt lat="41.90" lon="2.80"></trkpt>
      <trkpt lat="41.91" lon="2.81"></trkpt>
    </trkseg></trk></gpx>`;
    expect(() => enrichFeatureFromGpx(baseFeature(), noEle)).toThrow(
      /elevation/i
    );
  });

  it('throws on partial elevation (some points lack <ele>)', () => {
    // A gapped series would store a mixed 2D/3D geometry that breaks the profile
    // and lets gain bridge the gap — refuse it rather than enrich half a route.
    const gappy = `<gpx><trk><trkseg>
      <trkpt lat="41.90" lon="2.80"><ele>81</ele></trkpt>
      <trkpt lat="41.91" lon="2.81"></trkpt>
      <trkpt lat="41.92" lon="2.82"><ele>120</ele></trkpt>
    </trkseg></trk></gpx>`;
    expect(() => enrichFeatureFromGpx(baseFeature(), gappy)).toThrow(
      /elevation/i
    );
  });
});
