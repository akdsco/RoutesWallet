import { describe, it, expect } from 'vitest';
import { openLabel } from './links.ts';

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
