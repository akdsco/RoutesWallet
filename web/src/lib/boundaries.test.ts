import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { isUkCounty } from './region.ts';
import { makePointLookup } from './county-lookup.ts';

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

describe('world-countries boundary asset', () => {
  const world = JSON.parse(
    readFileSync('scripts/data/world-countries.geojson', 'utf8')
  ) as FeatureCollection<Polygon | MultiPolygon>;
  const countryOf = makePointLookup(world);

  it('is a non-empty FeatureCollection of named polygons', () => {
    expect(world.features.length).toBeGreaterThan(150);
    for (const f of world.features) {
      expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
      expect(typeof (f.properties as { name?: unknown }).name).toBe('string');
    }
  });

  it('resolves the routes we care about to the right country', () => {
    // Mallorca (Liam) + Como (Mikhail) — the ones name hints missed — plus the camps.
    expect(countryOf(3.119, 39.838)).toBe('Spain'); // Mallorca
    expect(countryOf(9.075, 45.808)).toBe('Italy'); // Lake Como
    expect(countryOf(2.821, 41.979)).toBe('Spain'); // Girona
    expect(countryOf(-0.09, 51.51)).toBe('United Kingdom'); // London
  });
});
