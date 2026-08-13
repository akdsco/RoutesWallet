import { describe, it, expect } from 'vitest';
import { groupByRegion } from './grouping.ts';
import type { Route } from '../types.ts';

function route(id: string, region: string): Route {
  return {
    id,
    name: id,
    link: `https://example.com/${id}`,
    distance_km: 10,
    source: 'club-verified',
    country: 'United Kingdom',
    region,
    notes: '',
    cafe: '',
    geometry: { type: 'LineString', coordinates: [[0, 0]] },
    centroid: [0, 0],
  };
}

describe('groupByRegion', () => {
  it('buckets routes by region, first-seen order, keeping members', () => {
    const groups = groupByRegion([
      route('a', 'Kent'),
      route('b', 'Essex'),
      route('c', 'Kent'),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Kent', 'Essex']);
    expect(groups[0]!.routes.map((r) => r.id)).toEqual(['a', 'c']);
    expect(groups[1]!.routes.map((r) => r.id)).toEqual(['b']);
  });

  it('falls back to "Other" for a blank region', () => {
    const [group] = groupByRegion([route('a', '')]);
    expect(group!.label).toBe('Other');
  });
});
