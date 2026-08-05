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

```ts
type Route = {
  id: string;
  name: string;
  link: string;                            // opens in Strava/RWGPS or a GPX download
  distance_km: number;
  source: 'HV-signed' | '3rd-party';       // trust badge; HV = vetted by the club
  geometry: GeoJSON.LineString;            // [lng, lat] pairs
  centroid: [number, number];              // [lng, lat], for cheap proximity pre-filter
};
```

### How to work here

- **Test-first for pure logic only** (the near-X filter, any parse/geocode helper):
  write the failing Vitest test, then the minimum to pass. Map/UI is verified by eye
  — say so honestly, don't fake a test.
- Small increments, one logical change per commit, typecheck + tests green at every
  step.
- **Drift tripwire:** any change that adds a dependency, adds a screen, or introduces
  a concept not in the scope above → **stop and ask**, do not build it.
