import { describe, it, expect } from 'vitest';
import { ingestMemberRoutes } from './member-ingest.ts';
import type { StravaRouteInput } from './strava-route.ts';
import type { Lookups } from './normalise.ts';

const canonical = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const route = (over: Partial<StravaRouteInput> = {}): StravaRouteInput => ({
  id_str: '1',
  name: 'R',
  distance: 50000,
  elevation_gain: 600,
  map: { summary_polyline: canonical },
  athlete: { id: 7, firstname: 'Sam', lastname: 'Rider' },
  ...over,
});

// Fake lookups so the test is about wiring, not the polygon assets: every point
// resolves to Kent / United Kingdom.
const kentLookups: Lookups = {
  countyOf: () => 'Kent',
  countryOf: () => 'United Kingdom',
};

describe('ingestMemberRoutes', () => {
  it('stamps country + region on each member route via majority vote', () => {
    const { fc, ingested, skipped } = ingestMemberRoutes(
      [route()],
      kentLookups
    );
    expect(ingested).toBe(1);
    expect(skipped).toBe(0);
    expect(fc.features[0]!.properties).toMatchObject({
      source: 'club-member',
      region: 'Kent',
      country: 'United Kingdom',
    });
  });

  it('skips (and counts) routes with no usable line, never silently', () => {
    const routes = [
      route({ id_str: 'good' }),
      route({ id_str: 'bad', map: { summary_polyline: '' } }),
    ];
    const { fc, ingested, skipped } = ingestMemberRoutes(routes, kentLookups);
    expect(ingested).toBe(1);
    expect(skipped).toBe(1);
    expect(fc.features.map((f) => f.properties?.id)).toEqual(['good']);
  });

  it('leaves region null for an away-country ride while still setting country', () => {
    const overseas: Lookups = {
      countyOf: () => null, // no UK county
      countryOf: () => 'Spain',
    };
    const { fc } = ingestMemberRoutes([route()], overseas);
    expect(fc.features[0]!.properties).toMatchObject({
      region: null,
      country: 'Spain',
    });
  });
});
