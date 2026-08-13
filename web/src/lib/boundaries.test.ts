import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { isUkCounty } from './region.ts';

// The committed build asset that the normalise script + importer resolve start
// points against. This harness keeps the dataset and the canonical UK_COUNTIES
// set from drifting apart, and guards coordinate order/bounds.
const boundaries = JSON.parse(
  readFileSync('scripts/data/uk-ceremonial-counties.geojson', 'utf8')
) as FeatureCollection<Polygon | MultiPolygon>;

describe('uk-ceremonial-counties boundary asset', () => {
  it('is a non-empty FeatureCollection of polygons', () => {
    expect(boundaries.type).toBe('FeatureCollection');
    expect(boundaries.features.length).toBeGreaterThan(40);
    for (const f of boundaries.features) {
      expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
    }
  });

  it('every feature names a canonical UK county (dataset ⊆ UK_COUNTIES)', () => {
    for (const f of boundaries.features) {
      const name = (f.properties as { name?: unknown }).name;
      expect(typeof name).toBe('string');
      expect(isUkCounty(name as string)).toBe(true);
    }
  });

  it('county names are unique', () => {
    const names = boundaries.features.map(
      (f) => (f.properties as { name: string }).name
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it('coordinates are [lng, lat] within Great Britain bounds', () => {
    // Spot-check the first ring vertex of each feature: lng roughly [-8, 2],
    // lat roughly [49, 56] — proves the axis order (a [lat, lng] file would fail).
    for (const f of boundaries.features) {
      const first =
        f.geometry.type === 'Polygon'
          ? f.geometry.coordinates[0]![0]!
          : f.geometry.coordinates[0]![0]![0]!;
      const [lng, lat] = first as [number, number];
      expect(lng).toBeGreaterThan(-8.5);
      expect(lng).toBeLessThan(2.5);
      expect(lat).toBeGreaterThan(49);
      expect(lat).toBeLessThan(56);
    }
  });
});
