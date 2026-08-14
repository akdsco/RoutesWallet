import { describe, it, expect } from 'vitest';
import { openLabel, sourceShortLabel, isGpxLink } from './links.ts';

describe('openLabel', () => {
  it('names the provider from the link host', () => {
    expect(openLabel('https://www.strava.com/routes/123')).toBe(
      'Open in Strava'
    );
    expect(openLabel('https://connect.garmin.com/modern/course/456')).toBe(
      'Open in Garmin Connect'
    );
    expect(openLabel('https://www.komoot.com/tour/456')).toBe('Open in Komoot');
    expect(openLabel('https://ridewithgps.com/routes/789')).toBe(
      'Open in RideWithGPS'
    );
    expect(openLabel('https://www.bikemap.net/en/r/123/')).toBe(
      'Open in Bikemap'
    );
    expect(openLabel('https://www.plotaroute.com/route/123')).toBe(
      'Open in Plotaroute'
    );
  });

  it('offers a GPX download for a .gpx link', () => {
    expect(openLabel('https://cdn.example.com/routes/loop.gpx')).toBe(
      'Download GPX'
    );
    expect(openLabel('https://cdn.example.com/loop.gpx?v=2')).toBe(
      'Download GPX'
    );
  });

  it('falls back to a neutral label for an unknown host', () => {
    expect(openLabel('https://example.com/x')).toBe('Open route');
  });

  it('never includes the arrow glyph (that is presentational)', () => {
    expect(openLabel('https://www.strava.com/routes/1')).not.toContain('↗');
  });
});

describe('sourceShortLabel — the compact §H source-button word', () => {
  it('shortens the provider name (RideWithGPS → RWGPS, Garmin Connect → Garmin)', () => {
    expect(sourceShortLabel('https://www.strava.com/routes/1')).toBe('Strava');
    expect(sourceShortLabel('https://ridewithgps.com/routes/2')).toBe('RWGPS');
    expect(sourceShortLabel('https://connect.garmin.com/course/3')).toBe(
      'Garmin'
    );
  });

  it('is "GPX" for a gpx download and neutral "Route" for an unknown host', () => {
    expect(sourceShortLabel('https://cdn.example.com/loop.gpx')).toBe('GPX');
    expect(sourceShortLabel('https://example.com/x')).toBe('Route');
  });

  it('carries no arrow (the caller adds ↗ / ↓)', () => {
    expect(sourceShortLabel('https://www.strava.com/routes/1')).not.toMatch(
      /[↗↓]/
    );
  });
});

describe('isGpxLink — download vs open-in-tab, for the button arrow', () => {
  it('is true only for a .gpx link', () => {
    expect(isGpxLink('https://cdn.example.com/loop.gpx')).toBe(true);
    expect(isGpxLink('https://cdn.example.com/loop.gpx?v=2')).toBe(true);
    expect(isGpxLink('https://www.strava.com/routes/1')).toBe(false);
  });
});
