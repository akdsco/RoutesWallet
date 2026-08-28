import { describe, it, expect } from 'vitest';
import { decodePolyline } from './polyline.ts';

describe('decodePolyline', () => {
  // The canonical Google encoded-polyline reference vector. Points are, in
  // (lat, lng): (38.5, -120.2), (40.7, -120.95), (43.252, -126.453). We return
  // GeoJSON [lng, lat] order.
  it('decodes the canonical reference vector into [lng, lat] pairs', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toHaveLength(3);
    expect(pts[0]![0]).toBeCloseTo(-120.2, 5);
    expect(pts[0]![1]).toBeCloseTo(38.5, 5);
    expect(pts[1]![0]).toBeCloseTo(-120.95, 5);
    expect(pts[1]![1]).toBeCloseTo(40.7, 5);
    expect(pts[2]![0]).toBeCloseTo(-126.453, 5);
    expect(pts[2]![1]).toBeCloseTo(43.252, 5);
  });

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('accumulates deltas so each point differs from the last', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts[0]).not.toEqual(pts[1]);
    expect(pts[1]).not.toEqual(pts[2]);
  });
});
