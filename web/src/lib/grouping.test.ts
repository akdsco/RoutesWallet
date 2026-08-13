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
    region,
    notes: '',
    cafe: '',
    geometry: { type: 'LineString', coordinates: [[0, 0]] },
    centroid: [0, 0],
  };
}

describe('groupByRegion', () => {
  it('buckets routes by region, keeping members in order', () => {
    const groups = groupByRegion([
      route('a', 'Kent'),
      route('b', 'Essex'),
      route('c', 'Kent'),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Kent', 'Essex']);
    expect(groups[0]!.routes.map((r) => r.id)).toEqual(['a', 'c']);
    expect(groups[1]!.routes.map((r) => r.id)).toEqual(['b']);
  });

  it('orders groups by route count descending, regardless of first appearance', () => {
    // Essex appears first but Kent is bigger → Kent leads.
    const groups = groupByRegion([
      route('e1', 'Essex'),
      route('k1', 'Kent'),
      route('k2', 'Kent'),
      route('k3', 'Kent'),
      route('e2', 'Essex'),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Kent', 'Essex']);
  });

  it('breaks count ties by first-seen order', () => {
    const groups = groupByRegion([route('s1', 'Surrey'), route('h1', 'Herts')]);
    expect(groups.map((g) => g.label)).toEqual(['Surrey', 'Herts']);
  });

  it('falls back to "Other" for a blank region', () => {
    const [group] = groupByRegion([route('a', '')]);
    expect(group!.label).toBe('Other');
  });
});
