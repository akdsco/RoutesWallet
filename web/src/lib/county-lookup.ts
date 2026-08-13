import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson';
import type { PointLookup } from './region.ts';

/**
 * Build a point→name resolver from a boundary FeatureCollection whose features
 * each carry a name on `properties.name`. Generic: used over the UK-county
 * boundaries (→ region) and the world-country boundaries (→ country). Geometry
 * maths goes through Turf (`booleanPointInPolygon`) — never hand-rolled.
 *
 * Build/import-time only: this is imported by the normalise script, the importer
 * and their tests, NOT by the app, so `@turf/boolean-point-in-polygon` stays a
 * devDependency and nothing extra ships to the client.
 */
export function makePointLookup(
  boundaries: FeatureCollection<Polygon | MultiPolygon>
): PointLookup {
  const named = boundaries.features.filter(
    (
      f
    ): f is Feature<Polygon | MultiPolygon> & {
      properties: { name: string };
    } =>
      typeof f.properties?.name === 'string' &&
      (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  );
  return (lng, lat) => {
    for (const f of named) {
      if (booleanPointInPolygon([lng, lat], f)) return f.properties.name;
    }
    return null;
  };
}
