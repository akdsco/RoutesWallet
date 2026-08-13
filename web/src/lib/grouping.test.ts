import { describe, it, expect } from 'vitest';
import { groupByRegion, resolveOpenGroups } from './grouping.ts';
import type { Route } from '../types.ts';

function route(
  id: string,
  region: string,
  country: string | null = 'United Kingdom'
): Route {
  return {
    id,
    name: id,
    link: `https://example.com/${id}`,
    distance_km: 10,
    source: 'club-verified',
    country,
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

  it('collapses a county-less country (Spain/Italy) to a country group, not "Other"', () => {
    const groups = groupByRegion([
      route('g1', '', 'Spain'),
      route('g2', '', 'Spain'),
      route('e1', 'Essex'),
    ]);
    // Spain has 2 routes, Essex 1 → Spain leads; no "Other" bucket appears.
    expect(groups.map((g) => g.label)).toEqual(['Spain', 'Essex']);
  });
});

describe('resolveOpenGroups', () => {
  const labels = ['Essex', 'Kent', 'Herts', 'Surrey', 'London'];

  it('opens the first three by default', () => {
    expect([...resolveOpenGroups(labels)]).toEqual(['Essex', 'Kent', 'Herts']);
  });

  it('a manual unfold opens a group past the first three', () => {
    const open = resolveOpenGroups(labels, {
      manualFolds: new Map([['Surrey', true]]),
    });
    expect(open.has('Surrey')).toBe(true);
  });

  it('a manual fold closes one of the first three', () => {
    const open = resolveOpenGroups(labels, {
      manualFolds: new Map([['Essex', false]]),
    });
    expect(open.has('Essex')).toBe(false);
    expect(open.has('Kent')).toBe(true);
  });

  it("the selected route's group opens over a manual fold", () => {
    const open = resolveOpenGroups(labels, {
      manualFolds: new Map([['London', false]]),
      selectedCounty: 'London',
    });
    expect(open.has('London')).toBe(true);
  });

  it('a single-county filter opens that county regardless of position', () => {
    const open = resolveOpenGroups(labels, { singleCounty: 'Surrey' });
    expect(open.has('Surrey')).toBe(true);
  });

  it('ignores fold/selection hints for counties not present', () => {
    const open = resolveOpenGroups(labels, {
      selectedCounty: 'Nowhere',
      manualFolds: new Map([['Ghost', true]]),
    });
    expect([...open]).toEqual(['Essex', 'Kent', 'Herts']);
  });
});
