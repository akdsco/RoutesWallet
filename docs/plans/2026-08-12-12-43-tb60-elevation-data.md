# tb60 elevation data

- Date: 2026-08-12 12:43
- Branch: tb60-elevation-data

## Tickets

- Resolves: https://app.notion.com/p/Enrich-route-data-with-elevation-data-extraction-only-3ba15f963d138113bcbcdf11b547a138 (TB-60)
- Refs:

## Problem / Context

routes.geojson has no elevation. The routes carry only `[lng, lat]` and no
ascent/owner data. We want, per route: total elevation gain, the elevation
profile (for a future chart), and the route owner.

Key finding while scoping: the existing importer (`web/scripts/import-from-strava.js`)
already fetches each route's **GPX** from a logged-in Strava session
(`fetch('/routes/<id>/export_gpx', {credentials:'include'})`). That GPX contains
**everything we need**, and the parser currently throws most of it away:

- `<trkpt lat lon><ele>…</ele>` — elevation per point (line 49 regex reads only
  lat/lon, drops `<ele>`).
- `<metadata><author><name>…</name><link href=".../athletes/<id>"/></author>` —
  owner name + Strava athlete id, free, no extra request.

So this is NOT a scrape/inject job. It's: **read the fields we already download,
rebuild geometry from the same GPX with elevation as the standard 3rd coordinate**
(`[lng, lat, ele]`, RFC 7946 — also maps 1:1 to PostGIS `LineStringZ` if we ever
move to a DB). No resampling, no alignment problem, no map-matching to preserve
(TB-46 never landed in the shipped file).

**Scope: data extraction only.** Drawing the profile chart / showing owner+gain in
the UI is a separate ticket. Here we only capture the data + widen the contract.

Sources: 125 routes = 122 Strava (re-fetchable by id), 2 RideWithGPS, 1 Garmin.
The 3 non-Strava can't use Strava `export_gpx`; handle separately (their own GPX)
or leave elevation null with a logged note — do not silently drop them.

## Plan

1. Extract the GPX parsing into small **pure, unit-tested** functions (currently
   inline regex in a browser-console script).
2. Compute total ascent from the elevation series (Turf where geo maths is
   involved; a plain positive-delta sum for gain is fine and testable).
3. Widen the data contract: geometry coords gain an optional 3rd element (ele,
   integer metres); add `elevation_gain_m`, `owner_name`, `owner_strava_id`.
4. Re-run extraction over the 122 Strava routes via the logged-in browser
   (chrome-devtools MCP), **keyed off the existing routes.geojson** so all curated
   metadata (regions, community routes, cafe/notes, source tiers) is preserved —
   only geometry+elevation+owner are refreshed. Non-Strava handled separately.
5. Validate the regenerated file; update contract docs + memory.

## Increments (test-first)

1. test: `parseTrackpoints(gpx)` returns `[lng,lat,ele]` triples, ele rounded to
   int, from a small GPX fixture; skips points with no `<ele>` gracefully → impl:
   pure fn in `web/scripts/gpx-parse.js`.
2. test: `parseAuthor(gpx)` returns `{ name, stravaId }` from `<metadata><author>`;
   returns null when absent → impl: pure fn.
3. test: `elevationGainM(eles)` sums positive deltas (flat=0, monotone-up=total,
   noisy series handled); returns integer → impl: pure fn. (Note honestly: this is
   a naive gain and can differ ~1-3% from Strava's smoothed figure; we compute our
   own from the authoritative series rather than scrape Strava's number.)
4. test: `featuresToRoutes` maps `elevation_gain_m`/`owner_name`/`owner_strava_id`
   when present and leaves them undefined when absent; 3-coord geometry is
   preserved and centroid still computes from the first two → impl: extend `Route`
   in `types.ts` + mapping in `routes-data.ts` (defensive, all new fields optional).
5. impl: wire the pure fns into `import-from-strava.js` (emit 3D coords + new
   props). Verify: run the pure fns over the GPX fixture end-to-end (thin glue, no
   new unit surface in the script itself).
6. data regen (not unit-testable — live logged-in fetch, stated honestly):
   re-fetch all 122 Strava GPX via chrome-devtools MCP keyed off existing features,
   write back. Verification harness: a check asserting every Strava feature now has
   3-coord geometry + `elevation_gain_m > 0` + `owner_name`; **log** any route that
   couldn't be enriched (incl. the 3 non-Strava) rather than failing silently.
7. impl: align the frozen contract doc (CLAUDE.md — currently stale vs code) +
   update the [[notion-tech-board]] / data memory with the new fields.

## Notes

- Backward-compat: `centroidOf` destructures `[x, y]`, so a 3rd coord element is
  ignored by existing code — safe.
- Be a good citizen on re-fetch: keep the importer's ~2 s sleep between requests
  (122 routes ≈ 4-5 min).
- ele rounded to integer metres (GPS vertical accuracy is ±several m; integers
  gzip smaller). Raw file grows ~+1.6 MB (316k vertices); marginal after CDN gzip.
- Not in scope: elevation/owner UI, the profile chart, RWGPS/Garmin deep parsing
  beyond a best-effort + log.
