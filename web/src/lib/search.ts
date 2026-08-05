import pointToLineDistance from '@turf/point-to-line-distance';
import { lineString, point } from '@turf/helpers';
import type { Route } from '../types.ts';

/** Shortest distance in km from a [lng, lat] point to a route's line. */
export function distanceToRouteKm(pt: [number, number], route: Route): number {
  return pointToLineDistance(point(pt), lineString(route.geometry.coordinates), {
    units: 'kilometers',
  });
}

/**
 * Routes whose line passes within `radiusKm` of `pt` ([lng, lat]), nearest first.
 * This is the one behaviour behind the "routes near <place>" search.
 */
export function routesNear(
  pt: [number, number],
  routes: Route[],
  radiusKm: number
): Route[] {
  return routes
    .map((route) => ({ route, km: distanceToRouteKm(pt, route) }))
    .filter(({ km }) => km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .map(({ route }) => route);
}
