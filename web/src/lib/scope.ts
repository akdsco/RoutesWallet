import type { Route } from '../types.ts';

/**
 * The "my routes vs all club routes" view (TB-116). A signed-in member can narrow
 * the pool to just the routes they contributed — a pure client-side filter on the
 * `owner_strava_id` already stamped on every route, no server round-trip. Passing
 * `ownerId === null` (the "all routes" view, or signed out) returns the input
 * untouched, so the caller can memo on it cheaply.
 */
export function scopeRoutes(routes: Route[], ownerId: string | null): Route[] {
  if (ownerId === null) return routes;
  return routes.filter((r) => r.owner_strava_id === ownerId);
}
