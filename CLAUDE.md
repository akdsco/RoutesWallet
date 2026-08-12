# CLAUDE.md — RoutesWallet

Loose monorepo. Two independent apps, one brand, **no workspaces** (they share no
code). Repo-level workflow rules come from the user-level `~/.claude/CLAUDE.md`.

- **`web/`** — the active app. A static web map of a club's routes with "routes near
  a place" search. This is what ships. Read `web/`'s own notes before working there.
- **`mobile/`** — the parked Expo/React Native app. Do not touch it unless asked; it
  has its own (double-quote) style and is excluded from Prettier.

## web/ — frozen v1 scope

v1 is **one screen, three behaviours**. Nothing else ships in v1:

1. Show **all** the club's routes on a map.
2. Search **"near \<place\>"** → filter to routes whose line passes near that point.
3. Click a route → open its **existing link** (Strava/GPX). The exit does not change.

### Non-goals — do NOT build these in v1 (say no and stop)

Accounts / login · a mobile app · send-to-device · follow / social graph · cafe or
winter-friendly metadata · monetisation / paywalls · **any backend or server**.

### Architecture invariants

- **Static site.** No server, no database, no auth. Data is one `routes.geojson`
  file served from the CDN. No secrets in the repo.
- Stack is fixed: **Vite + React + TypeScript (strict), Leaflet + OSM raster tiles,
  Turf.js** for geo maths. Do not swap the map lib or add a framework.
- **Never hand-roll geo maths** — distance/near-point goes through Turf.

### Frozen route data contract

Every route is exactly this shape. Do not mutate it without the user's say-so:

Source of truth is `web/src/types.ts`; keep this in sync with it.

```ts
type Route = {
  id: string;
  name: string;
  link: string; // opens in Strava/RWGPS or a GPX download
  distance_km: number;
  source: 'club-verified' | 'club-member' | 'third-party'; // trust tier
  region: string; // grouping + card meta, e.g. "Kent", "Hub Velo trips"
  notes: string; // free-text ride notes; may be empty
  cafe: string; // café stop; may be empty
  route_type?: string; // e.g. "Road" | "Gravel", from the GPX import
  elevation_gain_m?: number; // Strava's own displayed total; NOT recomputed
  owner_name?: string; // route owner, from GPX author metadata
  owner_strava_id?: string; // owner's Strava athlete id, for a profile link
  geometry: GeoJSON.LineString; // [lng, lat] or [lng, lat, ele] (elevation = 3rd axis)
  centroid: [number, number]; // [lng, lat], for cheap proximity pre-filter
};
```

Elevation rides in as the standard GeoJSON 3rd coordinate (`[lng, lat, ele]`,
whole metres) from the GPX `<ele>` tags — the profile chart is derived from it
(distance-along vs the 3rd axis), so there is no separate profile array.
`elevation_gain_m` is Strava's displayed figure, read off the route page at
import — never recomputed locally, since a different smoothing rule would
disagree. The 2 RideWithGPS + 1 Garmin routes have no Strava GPX, so they carry
neither elevation nor owner yet.

### How to work here

- **Three test layers** (see `web/` — this is the baseline):
  - **Unit** (Vitest, `src/lib/*.test.ts`) — pure logic. Test-first: write the
    failing test, then the minimum to pass.
  - **Integration** (Testing Library + jsdom, `src/*.test.tsx`) — App/Sidebar
    flows. Mock only the boundaries (`loadRoutes`, `geocode`, `RouteMap`);
    select-by-role, assert-on-semantics.
  - **E2E** (Playwright, `e2e/*.spec.ts`, `npm run e2e`) — critical journeys in a
    real browser, over `vite build` + `preview`, fully stubbed + offline.
  - Actual **map rendering / pixels** are still verified by eye — say so honestly,
    don't fake a test.
- Small increments, one logical change per commit, typecheck + tests green at every
  step.
- **Drift tripwire:** any change that adds a dependency, adds a screen, or introduces
  a concept not in the scope above → **stop and ask**, do not build it.
