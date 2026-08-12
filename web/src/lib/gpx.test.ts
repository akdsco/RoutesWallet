import { describe, it, expect } from 'vitest';
import { parseTrackpoints, parseAuthor, parseStatMeters } from './gpx.ts';

// A minimal StravaGPX sample: metadata/author + two trackpoints with elevation.
const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1">
 <metadata>
  <name>HVCC - Just Girona</name>
  <author>
   <name>Alex Booker ⓥ</name>
   <link href="https://www.strava.com/athletes/39587126"/>
  </author>
  <link href="https://www.strava.com/routes/3079343783499010458"/>
 </metadata>
 <trk>
  <trkseg>
   <trkpt lat="42.07902000000001" lon="2.7761400000000003">
    <ele>192.85000000000002</ele>
   </trkpt>
   <trkpt lat="42.0788" lon="2.7770">
    <ele>188.4</ele>
   </trkpt>
  </trkseg>
 </trk>
</gpx>`;

describe('parseTrackpoints', () => {
  it('returns [lng, lat, ele] triples, ele rounded to int, coords to 6dp', () => {
    expect(parseTrackpoints(GPX)).toEqual([
      [2.77614, 42.07902, 193],
      [2.777, 42.0788, 188],
    ]);
  });

  it('emits [lng, lat] (2D) for a trackpoint with no <ele>', () => {
    const g = `<trk><trkseg><trkpt lat="1.5" lon="2.5"></trkpt></trkseg></trk>`;
    expect(parseTrackpoints(g)).toEqual([[2.5, 1.5]]);
  });

  it('returns [] when there are no trackpoints', () => {
    expect(parseTrackpoints('<gpx></gpx>')).toEqual([]);
  });
});

describe('parseAuthor', () => {
  it('extracts owner name and Strava athlete id, stripping the verified badge', () => {
    expect(parseAuthor(GPX)).toEqual({
      name: 'Alex Booker',
      stravaId: '39587126',
    });
  });

  it('returns null when there is no author block', () => {
    expect(parseAuthor('<gpx><metadata></metadata></gpx>')).toBeNull();
  });
});

describe('parseStatMeters', () => {
  it('parses a metres string to an integer', () => {
    expect(parseStatMeters('388 m')).toBe(388);
  });

  it('handles thousands separators', () => {
    expect(parseStatMeters('1,234 m')).toBe(1234);
  });

  it('returns null for a non-metres value (e.g. km or time)', () => {
    expect(parseStatMeters('34.72 km')).toBeNull();
    expect(parseStatMeters('1:11:57')).toBeNull();
    expect(parseStatMeters('')).toBeNull();
  });
});
