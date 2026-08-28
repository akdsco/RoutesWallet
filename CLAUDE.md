# CLAUDE.md — RoutesWallet

Loose monorepo. Two independent apps, one brand, **no workspaces** (they share no
code). Repo-level workflow rules come from the user-level `~/.claude/CLAUDE.md`.

- **`web/`** — the active app. A static web map of a club's routes with "routes near
  a place" search. This is what ships. Read `web/`'s own notes before working there.
- **`mobile/`** — the parked Expo/React Native app. Do not touch it unless asked; it
  has its own (double-quote) style and is excluded from Prettier.

## web/ — scope (v2: member-contributed pool)

The core screen is **one map, three behaviours**:

1. Show **all** the club's routes on a map.
2. Search **"near \<place\>"** → filter to routes whose line passes near that point.
3. Click a route → open its **existing link** (Strava/GPX). The exit does not change.

**v2 (TB-110) adds a fourth: members contribute their own routes.** A member clicks
**Connect Strava**, authorises, and their routes are pulled (list-only), attributed,
region/country-normalised, and appended to a **shared pool** every visitor then sees.
This is the live direction we build forward on — not a throwaway. It deliberately
lifted the old v1 "no backend/no auth/no database" freeze for this one narrow path;
see the amended invariants below.

### Non-goals — still out of scope (say no and stop)

A relational user/club membership model · a mobile app · send-to-device · follow /
social graph · winter-friendly metadata · monetisation / paywalls · RideWithGPS
member import · share-consent flows · per-user route editing. The v2 backend is
deliberately the **thinnest** thing that proves the aggregation wow — one dumb D1
table + a Strava login — **not** a platform. Anything beyond that narrow path →
**stop and ask**.

### Architecture invariants

- **Static site + a thin serverless edge for the member path.** The app is still a
  static Vite bundle on Cloudflare Pages; the only server code is the Cloudflare
  Pages **Functions** in `web/functions/`: `/api/routes` reads the pool;
  `/connect/callback` does the Strava OAuth token exchange then redirects fast;
  `/connect/sync` does the list-only pull + ingest; `/api/me` + `/connect/logout`
  are the session endpoints (TB-116). Persistent state is one **D1** table
  (`web/migrations/`, seeded from `routes.geojson`); TB-116 added a **signed
  identity cookie** (`{athleteId, name}` — no user table) and a **KV namespace
  `SYNC`** holding the ephemeral, single-use access token between the two connect
  calls. **Still no secrets in the repo** — the Strava client secret,
  `SESSION_SECRET`, and the D1/KV bindings live in Cloudflare env vars only. Do
  **not** grow this into a database schema, an ORM, a stored-token store, or a
  relational user/club model — identity stays cookie-only.
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
  country: string | null; // top-level grouping, e.g. "United Kingdom"; null if unresolved
  region: string | null; // 2nd-level grouping (UK county), canonical name; null = none set
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

`country` + `region` are a **two-level grouping key**: a country "unlocks" its
region (county) picker. Both are **derived from geometry, never typed by hand** —
`npm run normalise:routes` samples points along each line and point-in-polygon
tests them (build assets in `web/scripts/data/`: England's ceremonial counties
for region, world countries for country), taking the **majority** of each.
Greater London is the club's home county, so a ride's region is the away-county
it reaches (a London→Kent ride is "Kent"); a London-only loop stays "Greater
London". Overseas rides get `region: null` and their real `country` (Spain,
Italy, …). Canonical set + logic live in `src/lib/region.ts`. The importer emits
neither field — it runs the normalise step instead, so re-imports stay clean
(TB-63).

Elevation rides in as the standard GeoJSON 3rd coordinate (`[lng, lat, ele]`,
whole metres) from the GPX `<ele>` tags — the profile chart is derived from it
(distance-along vs the 3rd axis), so there is no separate profile array.
`elevation_gain_m` for the 122 Strava routes is Strava's displayed figure, read
off the route page at import — never recomputed locally, since a different
smoothing rule would disagree.

**Non-Strava sources (2 RideWithGPS + 1 Garmin).** They have no Strava GPX and
expose no Strava-style displayed gain. They are enriched from their own GPX by
`web/scripts/enrich-non-strava.mjs` (re-runnable; GPX inputs dropped in
`scripts/non-strava-gpx/`, never hand-edited): elevation series from the source
`<ele>` tags (3rd coord, same as Strava), and `elevation_gain_m` **computed** from
that series (`src/lib/elevation.ts`, hysteresis 3 m). That computed gain is the
**deliberate exception** to the never-recompute rule above — it only held for
Strava because Strava showed its own number. Owner is set only when the GPX
carries an `<author>` (RWGPS/Garmin don't), and `owner_strava_id` stays absent for
non-Strava. Building link-based importers on this core is TB-65.

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
