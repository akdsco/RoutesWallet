import { describe, it, expect } from 'vitest';
import { openLabel } from './links.ts';

describe('openLabel', () => {
  it('names the provider from the link host', () => {
    expect(openLabel('https://www.strava.com/routes/123')).toBe(
      'Open in Strava ↗'
    );
    expect(openLabel('https://www.komoot.com/tour/456')).toBe(
      'Open in Komoot ↗'
    );
    expect(openLabel('https://ridewithgps.com/routes/789')).toBe(
      'Open in RideWithGPS ↗'
    );
  });

  it('defaults to Strava for unknown hosts', () => {
    expect(openLabel('https://example.com/x')).toBe('Open in Strava ↗');
  });
});
