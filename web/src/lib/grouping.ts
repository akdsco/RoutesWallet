import type { Route } from '../types.ts';
import { groupKeyOf } from './filters.ts';

export type RouteGroup = { label: string; routes: Route[] };

/**
 * Group routes by county for the sidebar (a country without county data collapses
 * to a country-level group — see `groupKeyOf`), ordered by route count descending
 * so the biggest groups lead and the "first three open" fold rule (§G) opens the
 * fullest. Ties keep first-seen order for stability. At ~125 routes a flat list is
 * unusable; grouped headers make it scannable. Pure — unit tested. Routes keep
 * their incoming order within a group (the caller sorts).
 */
export function groupByRegion(routes: Route[]): RouteGroup[] {
  const seen = new Map<string, number>(); // label → first-seen index
  const byRegion = new Map<string, Route[]>();
  for (const r of routes) {
    const key = groupKeyOf(r);
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

export type FoldContext = {
  /** county → explicit open/closed the rider set this session (overrides default). */
  manualFolds?: ReadonlyMap<string, boolean>;
  /** county of the currently-selected route — always opened so it's visible. */
  selectedCounty?: string | null;
  /** the sole county when a filter narrows to one — opened regardless of position. */
  singleCounty?: string | null;
  /** how many leading groups open by default (§G: first three). */
  defaultOpen?: number;
};

/**
 * Which county groups are open, per §G's fold rules. Default: the first
 * `defaultOpen` (3) groups by the given order. A manual fold/unfold overrides that
 * for its county and is remembered for the session. The selected route's group and
 * a single-county filter always force-open (over a manual fold). Pure — unit tested.
 */
export function resolveOpenGroups(
  orderedLabels: string[],
  {
    manualFolds,
    selectedCounty,
    singleCounty,
    defaultOpen = 3,
  }: FoldContext = {}
): Set<string> {
  const open = new Set(orderedLabels.slice(0, defaultOpen));
  if (manualFolds) {
    for (const [county, isOpen] of manualFolds) {
      if (!orderedLabels.includes(county)) continue;
      if (isOpen) open.add(county);
      else open.delete(county);
    }
  }
  if (selectedCounty && orderedLabels.includes(selectedCounty)) {
    open.add(selectedCounty);
  }
  if (singleCounty && orderedLabels.includes(singleCounty)) {
    open.add(singleCounty);
  }
  return open;
}
