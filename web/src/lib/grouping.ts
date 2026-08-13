import type { Route } from '../types.ts';

export type RouteGroup = { label: string; routes: Route[] };

/**
 * Group routes by region (= county) for the sidebar, ordered by route count
 * descending so the biggest counties lead and the "first three open" fold rule
 * (§G) opens the fullest groups. Ties keep first-seen order for stability. At
 * ~125 routes a flat list is unusable; grouped headers make it scannable. Pure —
 * unit tested. Routes keep their incoming order within a group (the caller sorts).
 */
export function groupByRegion(routes: Route[]): RouteGroup[] {
  const seen = new Map<string, number>(); // label → first-seen index
  const byRegion = new Map<string, Route[]>();
  for (const r of routes) {
    const key = r.region || 'Other';
    let bucket = byRegion.get(key);
    if (!bucket) {
      bucket = [];
      byRegion.set(key, bucket);
      seen.set(key, seen.size);
    }
    bucket.push(r);
  }
  return [...byRegion.entries()]
    .map(([label, groupRoutes]) => ({ label, routes: groupRoutes }))
    .sort(
      (a, b) =>
        b.routes.length - a.routes.length ||
        seen.get(a.label)! - seen.get(b.label)!
    );
}
