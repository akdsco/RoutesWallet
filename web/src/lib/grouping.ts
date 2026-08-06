import type { Route } from '../types.ts';

export type RouteGroup = { label: string; routes: Route[] };

/**
 * Group routes by region for the idle sidebar, preserving first-seen region order
 * so the list is stable. At ~100 routes a flat list is unusable; sticky region
 * headers make it scannable. Pure — unit tested.
 */
export function groupByRegion(routes: Route[]): RouteGroup[] {
  const order: string[] = [];
  const byRegion = new Map<string, Route[]>();
  for (const r of routes) {
    const key = r.region || 'Other';
    let bucket = byRegion.get(key);
    if (!bucket) {
      bucket = [];
      byRegion.set(key, bucket);
      order.push(key);
    }
    bucket.push(r);
  }
  return order.map((label) => ({ label, routes: byRegion.get(label)! }));
}
