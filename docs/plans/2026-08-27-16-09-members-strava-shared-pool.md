# members strava shared pool

- Date: 2026-08-27 16:09
- Branch: members-can-t-add-their-own-routes-no-way-to-test-whether-a-pooled-club-library-is-valuable

## Tickets

<!-- The ticket(s) this plan's PR RESOLVES vs merely REFS (coordination). Paste the
     Notion URL(s); the machine keys on the UUID in the URL. /ship links the PR +
     marks In progress; /cleanup closes Resolves to Done on merge. Refs are never
     auto-closed. The TB-xx label is optional human sugar. -->

- Resolves: https://app.notion.com/p/Members-can-t-add-their-own-routes-no-way-to-test-whether-a-pooled-club-library-is-valuable-3c915f963d138129bf3afc2c86dc7065
- Refs:

## Problem / Context

**TB-110 (Web).** The web app serves a static baked-in `web/public/routes.geojson`
(125 routes). No member can contribute their own, so the core product bet — *does a
club pooling its members' routes feel valuable?* — is untestable without
hand-collecting GPX. This build lets a member connect Strava in one click; their
routes are pulled, attributed, and appended to a **shared pool** every visitor sees.

**This is v2, built forward — not a throwaway.** We do not intend to come back and
rebuild it "properly"; we continue on this foundation. So the choices are lean but
forward-compatible (a real table, the existing `Route` contract, the existing
`loadRoutes` swap seam), not disposable hacks.

**Deliberate scope change.** This inverts three frozen v1 invariants in
`web/CLAUDE.md` (static site, no backend, no auth, no database). The ticket
authorises exactly that. Part of this work is **updating `web/CLAUDE.md` + project
memory** so the new direction is the recorded scope and the next session isn't
blocked by the old drift tripwire.

### Key facts (from the codebase)

- **Load seam:** `loadRoutes(url = '/routes.geojson')` in `web/src/lib/routes-data.ts`
  → `fetch` + `featuresToRoutes()` defensive normaliser. Called once at mount in
  `web/src/App.tsx`. This is the single swap point.
- **Route contract** (`web/src/types.ts`) already carries `owner_name`,
  `owner_strava_id`, `source: 'club-member'`, and nullable `region`/`country` — a
  member route lands with **no schema change**.
- **Deploy:** Cloudflare Pages, root dir `web`, free tier. → serverless =
  **Cloudflare Pages Functions** in `web/functions/` (same origin, same deploy,
  secrets in CF env vars — satisfies "no secrets in repo"). Store = **Cloudflare
  D1** (same vendor, atomic appends).
- **Region/country** are derived from geometry by point-in-polygon majority vote
  (`web/src/lib/region.ts` + polygons in `web/scripts/data/`), today as an offline
  build step. Strava never supplies them.
- **RN reference:** `mobile/integrations/strava/api.ts` + `StravaAuth/` — real
  OAuth + `GET /athletes/{id}/routes` pagination. The one piece that can't port to
  a browser SPA is the **client-secret token exchange**, which moves into the
  Function.

### Locked decisions

- **Store:** Cloudflare D1, one table, **seeded** with the current 125 routes so the
  pool is full on first load.
- **Route data:** **list-only** — geometry from `map.summary_polyline`, `distance` +
  `elevation_gain` from the route object. No per-route `export_gpx` → connect is
  ~1–3s regardless of route count, no subrequest fan-out, no timeout risk. Trade-off:
  member routes have **no elevation *profile* chart** (they keep the climb total);
  addable later via a background GPX enrichment pass.
- **Region/country: normalised inline** in the Function (sample `summary_polyline` →
  `region.ts`). Member routes are **fully country + county filterable** — this is the
  "wow" being validated.
- **Re-connect:** browser `localStorage` flag ("already contributed" → skip re-pull /
  relabel the button) **plus** D1 upsert keyed on the stable Strava route `id_str`, so
  a re-pull never duplicates rows.
- **Secrets / ops (user, not code):** register a Strava API app with the Pages
  callback domain; set CF env vars `STRAVA_CLIENT_ID` (+ `VITE_STRAVA_CLIENT_ID` for
  the authorize URL), `STRAVA_CLIENT_SECRET`, and the D1 binding. Documented, not
  committed.

## Behaviours — Given / When / Then

(From the ticket's acceptance criteria.)

- **B1 — Connect fetches.** *Given* a member on the web app, *when* they click
  "Connect Strava" and authorise, *then* their Strava routes are fetched (server-side
  token exchange + `GET /athletes/{id}/routes`).
- **B2 — Attributed append.** *Given* a connected member, *when* the pull completes,
  *then* each route is transformed to the `Route` shape, stamped with owner
  (`owner_name` / `owner_strava_id`) + `source: 'club-member'` + region/country, and
  upserted (by route `id_str`) into the shared D1 store.
- **B3 — Combined pool for all.** *Given* any visitor, *when* the app loads, *then*
  `loadRoutes` reads the shared store (seeded 125 + all member routes) and renders the
  combined, filterable pool, replacing the baked-in file as the live source.
- **B4 — No duplicate on re-connect.** *Given* a member who already contributed,
  *when* they return, *then* the browser flag skips a re-pull, and any re-pull that
  does happen upserts by `id_str` rather than duplicating.

## Increments (test-first)

<!-- Ordered, commit-sized steps. Each becomes one meaningful commit. -->

1. **Read seam → `/api/routes`.** (B3)
   - test (unit): `loadRoutes()` default URL is `/api/routes`; parses a FeatureCollection
     response through `featuresToRoutes` unchanged.
   - impl: point `loadRoutes` default at `/api/routes`; add `web/functions/api/routes.ts`
     that reads D1 and returns a GeoJSON FeatureCollection. Keep `/routes.geojson`
     as the seed source on disk.

2. **`stravaRoute → Route` transform lib.** (B2)
   - test (unit, `web/src/lib/strava-route.test.ts`): given a `StravaRouteAPI` object,
     returns a valid `Route` feature — `id` from `id_str`, geometry decoded from
     `summary_polyline`, `distance_km`, `elevation_gain_m`, `owner_name`/
     `owner_strava_id` from `athlete`, `source: 'club-member'`, region/country left for
     the normalise step.
   - impl: `web/src/lib/strava-route.ts` (+ a small polyline decoder, unit-tested) reused
     by the Function.

3. **Inline region/country normalise in the transform path.** (B2, wow)
   - test (unit): a member route whose polyline sits in a known county gets that
     `region`/`country` via `region.ts`; an overseas line gets `region: null` + real
     country; London-only loop stays "Greater London".
   - impl: run `region.ts` over the decoded polyline inside the transform; ensure the
     county/country polygon assets are importable from the Function bundle.

4. **D1 store: schema + seed + upsert.** (B2, B3, B4)
   - test (unit): the store module's `upsertRoutes` is idempotent on `id_str` (same route
     twice → one row); `readAll` returns a FeatureCollection.
   - impl: D1 migration (one `routes` table, `id_str` PK, `feature_json`, `owner_strava_id`);
     a seed script loading the current `routes.geojson`; wire `/api/routes` to `readAll`.

5. **`/connect/callback` Function: OAuth + fetch + transform + upsert.** (B1, B2)
   - test (unit): handler with mocked `fetch` (token endpoint + routes endpoint) and a
     fake store → exchanges code, paginates routes, transforms+normalises, upserts;
     surfaces errors loudly (no silent swallow); redirects home on success.
   - impl: `web/functions/connect/callback.ts` — token exchange with server-side secret,
     `GET /athletes/{id}/routes` pagination, transform (incr. 2–3), upsert (incr. 4).

6. **Frontend "Connect Strava" entry + browser flag.** (B1, B4)
   - test (integration, `web/src/*.test.tsx`, select-by-role): a "Connect Strava" control
     is present; clicking it navigates to the Strava authorize URL built from
     `VITE_STRAVA_CLIENT_ID` + redirect URI + scope `read,activity:read_all`; when the
     `localStorage` "contributed" flag is set, the control is relabelled/hidden.
   - impl: the button + authorize-URL builder + `localStorage` guard.

7. **E2E happy path.** (B1–B4)
   - test (Playwright, `web/e2e/`): stub Strava (authorize + token + routes) and `/api/routes`;
     load → seeded pool visible; connect → member route appears in the pool and is
     county-filterable; reload with flag → no re-pull, no duplicate.
   - impl: e2e stubs in `web/e2e/helpers.ts`.

8. **Docs + scope update + teardown.** (scope)
   - impl: update `web/CLAUDE.md` (v1-frozen → v2: member contribution via Strava +
     serverless D1 store; new invariants — secrets in CF only, the Function as the write
     path); add a Cloudflare Functions + D1 + Strava-app runbook section to
     `docs/DEPLOYMENT.md` incl. env vars and a **teardown** note; refresh project memory.

## Notes

- **Fail-loud:** the callback Function classifies permanent vs transient failures
  (bad scope, token error, Strava 4xx) and surfaces them — no bare catch. Any
  deliberate per-route skip is logged + flagged, with a `silent-ok:` marker if truly safe.
- **Rate limits:** Strava free API 100 req/15min, 1000/day — list-only keeps it to
  ~1–2 calls per connect; fine for a handful of friends.
- **Out of scope:** relational user/club schema, membership model, RideWithGPS, share-
  consent flows, per-user route editing, elevation *profile* chart for member routes.
- **Risk:** member routes rely on `summary_polyline` resolution for the map line and for
  region sampling — adequate for grouping; full-res geometry is a later GPX-enrichment
  follow-up if it earns its place.
