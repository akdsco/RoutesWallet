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

// Guard tests: the non-Strava enrichment (TB-64) reuses these parsers on
// RideWithGPS and Garmin GPX. Their flavours differ from Strava's — namespaced
// <gpx>, multiline <trkpt>…<ele>, and NO <author> block — so lock that the same
// parsers handle them, and that a future regex tweak can't silently break it.

// RideWithGPS export (…/routes/<id>.gpx?sub_format=track): namespaced root,
// metadata has name/link/time but no author, elevation is a child of <trkpt>.
const RWGPS_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns:gpxdata="http://www.cluetrust.com/XML/GPXDATA/1/0" xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="http://ridewithgps.com/">
  <metadata>
    <name>Girona - Day 2 - Rocacorba</name>
    <link href="https://ridewithgps.com/routes/50433954"><text>Girona</text></link>
    <time>2025-04-22T05:37:50Z</time>
  </metadata>
  <trk>
    <trkseg>
      <trkpt lat="41.97871" lon="2.82056">
        <ele>81.2</ele>
      </trkpt>
      <trkpt lat="41.97889" lon="2.82073">
        <ele>82.9</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

// Garmin Connect course export: creator="Garmin Connect", multiline <trkpt>,
// no <author>.
const GARMIN_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Garmin Connect" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Copy of Girona-Rocacorba-Banyoles-Girona</name>
    <link href="connect.garmin.com"><text>Garmin Connect</text></link>
    <time>2026-04-21T06:32:11.000Z</time>
  </metadata>
  <trk>
    <trkseg>
      <trkpt lat="41.9836" lon="2.8214">
        <ele>40.0</ele>
      </trkpt>
      <trkpt lat="41.9840" lon="2.8220">
        <ele>44.6</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('non-Strava GPX flavours (RideWithGPS / Garmin)', () => {
  it('parses RideWithGPS trackpoints to [lng, lat, ele] triples', () => {
    expect(parseTrackpoints(RWGPS_GPX)).toEqual([
      [2.82056, 41.97871, 81],
      [2.82073, 41.97889, 83],
    ]);
  });

  it('parses Garmin trackpoints to [lng, lat, ele] triples', () => {
    expect(parseTrackpoints(GARMIN_GPX)).toEqual([
      [2.8214, 41.9836, 40],
      [2.822, 41.984, 45],
    ]);
  });

  it('returns null owner for both — neither carries an <author>', () => {
    expect(parseAuthor(RWGPS_GPX)).toBeNull();
    expect(parseAuthor(GARMIN_GPX)).toBeNull();
  });
});
