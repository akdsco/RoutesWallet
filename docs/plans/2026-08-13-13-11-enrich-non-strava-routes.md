# enrich non strava routes

- Date: 2026-08-13 13:11
- Branch: enrich-non-strava-routes-rwgps-garmin-with-elevation-owner-data

## Tickets

<!-- The ticket(s) this plan's PR RESOLVES vs merely REFS (coordination). Paste the
     Notion URL(s); the machine keys on the UUID in the URL. /ship links the PR +
     marks In progress; /cleanup closes Resolves to Done on merge. Refs are never
     auto-closed. The TB-xx label is optional human sugar. -->

- Resolves: https://app.notion.com/p/Enrich-non-Strava-routes-RWGPS-Garmin-with-elevation-owner-data-3bb15f963d1381d0902bf730ccb0420f
- Refs: https://app.notion.com/p/Build-RWGPS-Garmin-link-importers-pull-route-data-incl-elevation-from-a-URL-3bb15f963d1381c89356e7c5be860840 (TB-65, downstream importer build that reuses this ticket's libs)

## Decisions (locked 2026-08-13)

- **Gain threshold = 3 m** hysteresis (light; route 1 ≈ 1467 m).
- **Sourcing:** Garmin GPX (`~/Downloads/COURSE_451746090.gpx`, 6328 pts ✓) + RWGPS
  route 1 (public fetch) in hand; **route 2 (private RWGPS) exported by the owner**
  into the drop folder.
- **Importers** are out of scope here → tracked as **TB-65** (refs TB-61 spike).
- **`region`/country** left untouched — the user handles that separately.

## Problem / Context

TB-60 (PR #12) enriched 122/125 routes with elevation (GeoJSON 3rd coord) + owner
by re-fetching each Strava route's GPX from a logged-in session. The remaining **3
non-Strava routes** have no Strava GPX to re-fetch, so they still carry flat 2D
`[lng, lat]` geometry and no `elevation_gain_m` / owner:

| id                 | source | route                       | dist | pts    |
| ------------------ | ------ | --------------------------- | ---- | ------ |
| `rwgps-50433954`   | RWGPS  | Girona (Tia's favourite)    | 74km | 5 336  |
| `rwgps-39193814`   | RWGPS  | Wadhurst–Uckfield audax     | 209km| 13 842 |
| `garmin-451746090` | Garmin | Girona (Tia's Garmin fave)  | 78km | 6 328  |

This is a **data-quality ticket, no UI** (TB-62 is the consumer: elevation filter +
Flattest/Hilliest sort — it must stop special-casing these 3 as "no elevation").

**Scoping findings (verified this session):**

- **RWGPS GPX is a full `<ele>` series.** `ridewithgps.com/routes/<id>.gpx?sub_format=track`
  returns 1 `<ele>` per trackpoint (route 1: 5 336 ele pts, 52→959 m — it climbs
  Rocacorba). The existing `parseTrackpoints` regex in `src/lib/gpx.ts` already
  handles the RWGPS multiline `<trkpt>\n  <ele>` shape → **reuse, don't rewrite.**
- **RWGPS GPX has no `<author>`** (only `<name>`/`<link>`/`<time>`) → no owner from
  RWGPS, and RWGPS owners have no Strava id anyway.
- **2 of 3 sources need an authed session.** Route 1 (RWGPS) is public and
  fetchable now; route 2 (RWGPS) returns **HTTP 401** (private); Garmin needs a
  logged-in export. So — exactly like the Strava importer — the authed GPX must be
  **hand-exported by the logged-in owner**, not auto-fetched by a script.
- **No displayed-gain number to read.** TB-60's rule is "use the source's own
  displayed gain, never recompute" — but that was only possible because Strava
  renders one. RWGPS/Garmin give us no equivalent we treat as canonical, and
  hand-typing a page number would be exactly the "hand-edited" the ticket forbids.
  → The agreed rule computes gain **from the `<ele>` series**, deterministically.
- **Node 24** strips types, so a build-time script can `import` the real
  `src/lib/*.ts` parsers directly — no third copy of the parse logic (the
  browser-console `import-from-strava.js` mirror stays as-is).

### Agreed rule for non-Strava sources (this is the ticket's "decide + document")

1. **Elevation series** → always the source GPX `<ele>` tags, as the standard
   GeoJSON 3rd coordinate `[lng, lat, ele]` (whole metres). Same as Strava.
2. **`elevation_gain_m`** → **computed from that `<ele>` series** by summing positive
   deltas under a small hysteresis threshold (rejects GPS jitter). Deterministic +
   re-runnable. This is the **explicit exception** to TB-60's never-recompute rule,
   which only ever applied because Strava displayed its own figure. Candidate gains
   for route 1 (Rocacorba): naive Σ+Δ = 1 812 m, hysteresis 3 m = 1 467 m, 5 m =
   1 358 m. **Proposed threshold: 3 m** (light; keeps real climbs, drops noise).
3. **Owner** → `owner_name` only when the source GPX carries an author block;
   absent otherwise (no fabrication). `owner_strava_id` stays absent for non-Strava.

## Plan

Pure logic in `src/lib` (typechecked + unit-tested), a thin build-time script as
glue, data regenerated + committed, rule documented.

1. **`src/lib/elevation.ts`** (new, pure): `elevationGainM(coords, { threshold })`
   — gain from the 3rd coordinate via hysteresis positive-delta sum; integer
   metres; a series with no 3rd coord returns 0. (Revives the `elevationGainM`
   TB-60 scoped but didn't ship, since Strava's displayed number replaced it.)
2. **Reuse** `parseTrackpoints` + `parseAuthor` from `src/lib/gpx.ts` unchanged;
   add a guard test proving they parse the RWGPS/Garmin GPX flavour (locks the
   reuse so a future regex tweak can't silently break non-Strava import).
3. **`src/lib/enrich.ts`** (new, pure): `enrichFeature(feature, { coords, author, gain })`
   → returns a new feature with 3D geometry + `elevation_gain_m` + owner merged,
   all other props untouched; idempotent (running on an already-enriched feature
   yields an identical feature).
4. **`web/scripts/enrich-non-strava.mjs`** (glue, not unit-tested — stated
   honestly): reads GPX from `web/scripts/non-strava-gpx/<id>.gpx`, parses via the
   `src/lib` fns, computes gain, calls `enrichFeature` for each of the 3 ids in
   `public/routes.geojson`, writes the file back. Logs each route's result and
   **logs (not silently skips)** any id whose GPX file is missing.
5. **Data regen:** fetch route 1's public GPX into the drop folder; routes 2 + 3
   supplied by the logged-in owner's export (**dependency on the user** — see
   Risks). Run the script; commit the regenerated `routes.geojson`.
6. **Docs:** update the frozen-contract note in root `CLAUDE.md` (drop "…carry
   neither elevation nor owner yet"), document the rule in the script header +
   a short `web/scripts/non-strava-gpx/README.md`, and update the
   `[[route-elevation-enrichment]]` memory.

## Increments (test-first)

<!-- Ordered, commit-sized steps. Each becomes one meaningful commit. -->

1. **test:** `elevationGainM` — flat series → 0; monotone climb → total ascent;
   noisy series → sub-threshold wobble rejected; result is an integer; 2D coords
   (no 3rd element) → 0. **impl:** `src/lib/elevation.ts`.
2. **test:** `parseTrackpoints`/`parseAuthor` against a small **RWGPS-shaped**
   fixture (namespaced `<gpx>`, multiline `<trkpt>` + `<ele>`, no `<author>`) →
   `[lng,lat,ele]` triples + `parseAuthor` returns null. **impl:** none expected
   (guard/characterisation test); only touch `gpx.ts` if the fixture fails.
3. **test:** `enrichFeature` — adds 3D geometry + `elevation_gain_m` + `owner_name`
   from inputs; leaves region/notes/cafe/source/link untouched; omits owner when
   author is null; is idempotent on re-run. **impl:** `src/lib/enrich.ts`.
4. **impl + data:** write `enrich-non-strava.mjs`; fetch route 1 GPX; ingest routes
   2 + 3 GPX from the drop folder; regenerate `routes.geojson`. **Verify (harness,
   honest):** a check asserting all 3 ids now have 3-coord geometry +
   `elevation_gain_m > 0`, the other 122 features are byte-identical, and a second
   run produces an identical file. Any route still missing GPX is **logged**, not
   dropped.
5. **docs:** contract note in `CLAUDE.md` + script header rule + drop-folder README
   + `[[route-elevation-enrichment]]` memory update.

## Out of scope / risks

- **Out of scope:** any UI (profile chart, gain badge, elevation filter/sort) —
  that's TB-62. The Strava-import path and the 122 enriched routes are untouched.
  DEM-from-geometry elevation (the ticket's last-resort fallback) — not needed,
  since every source has a real `<ele>` series once its GPX is in hand.
- **Risk — dependency on the user for 2 GPX exports.** I can fetch route 1 (public
  RWGPS). Routes 2 (private RWGPS, 401) + 3 (Garmin) need *your* logged-in export
  dropped into `web/scripts/non-strava-gpx/`. Until they're supplied the script
  enriches only route 1 and logs the other two as missing — the branch can ship
  incrementally or wait for all three.
- **Risk — mixed gain methods across the file.** 122 routes carry Strava's
  *displayed* gain; these 3 carry a *computed* gain. A systematic offset could
  nudge their Flattest/Hilliest position in TB-62. Acceptable for 3/125 and
  documented; the threshold is the one knob to tune.
- **Risk — threshold choice is a judgement call.** 3 m proposed; no source number
  to calibrate against. Documented as tunable in one place.
