# normalise route region → county

- Date: 2026-08-13 13:27
- Branch: normalise-route-region-county-data-prerequisite-for-filters-grouping
- Ticket: TB-63 (Web)

## Tickets

<!-- The ticket(s) this plan's PR RESOLVES vs merely REFS (coordination). Paste the
     Notion URL(s); the machine keys on the UUID in the URL. /ship links the PR +
     marks In progress; /cleanup closes Resolves to Done on merge. Refs are never
     auto-closed. The TB-xx label is optional human sugar. -->

- Resolves: https://app.notion.com/p/Normalise-route-region-county-data-prerequisite-for-filters-grouping-3bb15f963d138158b2d6ceb508a9282a
- Refs: TB-62 (Filters, sort & grouping — the consumer of this data)

## Problem / Context

`region` today is a **mix** of real counties and informal groupings, so county
grouping (TB-62) can't be trusted. Across 125 routes: Essex 60, Hub Velo trips 20,
Kent 17, Herts 12, London 4, Surrey 4, Other/Ultra 3, Bucks 1, Sussex 1, Windsor
and Maidenhead 1, Devon 1, Somerset 1. ~28 rows aren't a clean county.

**Agreed model (decisions locked with the user):**

- **Two-level grouping: `country` → `region`.** A user picks a country first; only
  when that country is "unlocked" (UK) can they then pick a region (county). This
  ticket is data-only; the filter UI is TB-62.
- **Contract change (signed off).** Add `country: string` (**always set**) and
  **repurpose `region`** from `string` to **`string | null`**, holding the
  second-level grouping key (the UK county). **Explicit `null`** = "no region set
  yet" — never `""`. This mutates the frozen Route contract, so `types.ts` + the
  frozen-contract block in the root `CLAUDE.md` change together.
- **Full canonical county names** (Herts → Hertfordshire, Bucks →
  Buckinghamshire, London → Greater London, Windsor and Maidenhead → Berkshire,
  Sussex → East/West Sussex per the boundary set).
- **Geometry-first resolution.** The route's **start point** (`coordinates[0]`) is
  tested with **Turf point-in-polygon** against a **UK ceremonial-counties boundary
  set**. Inside a county → `country = "United Kingdom"`, `region` = that county.
  Outside every UK county (e.g. Girona/Calpe) → `region = null`, `country` from a
  small name-hint resolver (Girona/Calpe → `"Spain"`) else `null`. This replaces
  the messy labels with a derived, reproducible truth and honours the "geo maths
  goes through Turf" invariant. The existing labels become a **cross-check** (the
  60 Essex starts should resolve to Essex) — mismatches are logged, not silently
  trusted.
- **Re-runnable transform, not hand edits.** A deterministic Node script rewrites
  `routes.geojson`; running it twice yields an identical file.

**New dependency + asset (drift tripwire — flagged for sign-off):**

1. `@turf/boolean-point-in-polygon` as a **devDependency** — build/import-time
   only, same Turf 7 family already used; **nothing new ships to the client**.
2. A **UK ceremonial-counties boundary GeoJSON** committed under
   `web/scripts/data/` as a build asset (sourced from an OGL/public dataset,
   simplified). Not served from `public/`, so the static-site bundle is unchanged.

## Plan

Layers, cheapest-honest-test first:

- **`web/src/lib/region.ts`** (pure, unit-tested):
  - `COUNTRIES` + `UK_COUNTIES` — the **closed, documented** canonical sets.
  - `countyOfPoint(lng, lat, counties): string | null` — thin Turf
    `booleanPointInPolygon` wrapper returning the canonical county name or null.
  - `resolveCountryRegion({ start, name }, counties): { country: string|null; region: string|null }`
    — geometry-first, name-hint fallback for country; the single source of truth
    the migration script **and** the importer both call.
- **`web/scripts/normalise-routes-geojson.mjs`** — one-time, re-runnable: load the
  boundary set + `public/routes.geojson`, run each feature through
  `resolveCountryRegion`, write `country` + `region` back (region `null` where
  unresolved), report a per-value before/after summary + any label↔geometry
  mismatches. Idempotent.
- **`web/scripts/import-from-strava.js`** — add `country` to the `META` shape and
  route new imports through the same normalise logic so re-imports stay
  normalised; `region` emitted as `null` when no county. (Console-paste script,
  so the canonical mapping is inlined the way `gpx.ts` is, kept in sync.)
- **Contract**: `types.ts` (`country: string`; `region: string | null`),
  `routes-data.ts` loader (parse `country`, allow null `region`), and the frozen
  contract block in root `CLAUDE.md`.

## Behaviours — Given / When / Then

- **B1** Given a route whose start falls in a UK county polygon, When normalised,
  Then `country = "United Kingdom"` and `region` = that county's canonical full
  name.
- **B2** Given a route whose start is outside every UK county polygon, When
  normalised, Then `region = null` and `country` = the name-hint result (Spain for
  Girona/Calpe) or `null` — never `""`.
- **B3** Given the whole `routes.geojson` after the transform, Then every route has
  a `country` and a `region` that is a canonical-set member **or** explicit null;
  no informal value survives.
- **B4** Given `COUNTRIES`/`UK_COUNTIES`, Then they are closed + documented and
  every non-null `region` is a member.
- **B5** Given the transform run twice on the same input, Then the outputs are
  byte-identical (deterministic).
- **B6** Given the importer, When a route is imported, Then it emits normalised
  `country` + `region` (region null when no county).
- **B7** Given the contract change, Then `types.ts` + root `CLAUDE.md` document
  `country` + nullable `region`, and the loader/tests stay green.

## Increments (test-first)

1. **Canonical set + `countyOfPoint`** — test (red): `region.test.ts` asserts a
   point inside a synthetic square polygon → its county name; a point outside →
   `null`; `UK_COUNTIES` is a closed frozen list. impl (green): `region.ts` with
   the sets + Turf `booleanPointInPolygon` wrapper. Add
   `@turf/boolean-point-in-polygon` devDep. → B1, B4.
2. **`resolveCountryRegion`** — test: start inside a UK county → `{ United Kingdom,
   <county> }`; start outside all + name "Girona…" → `{ Spain, null }`; start
   outside all + unknown name → `{ null, null }`; never returns `""`. impl: the
   resolver. → B1, B2.
3. **Contract + loader** — test: `routes-data.test.ts` — a feature with `country`
   + null `region` loads with `region === null` and the country preserved;
   missing country coerces safely. impl: `types.ts` (`country`, `region:
   string|null`), `routes-data.ts`; fix `grouping.ts`/its test for nullable region
   (null → "Other" fallback already holds). → B7.
4. **Source + commit the boundary GeoJSON** — verify (harness): a check asserts the
   file parses, is a FeatureCollection of Polygons/MultiPolygons, and every feature
   carries a name that is in `UK_COUNTIES` (dataset ↔ canonical set agree). → B4.
5. **Normalise script + run it** — test: a small fixture FeatureCollection through
   the script's core yields expected country/region and is idempotent (run twice =
   same). impl: `normalise-routes-geojson.mjs`; then run it on the real file,
   commit the rewritten `routes.geojson`, and record the before/after +
   mismatch summary in the PR. → B3, B5.
6. **Importer emits country/region** — verify: the inlined normalise path in
   `import-from-strava.js` maps a sample META row to normalised country + null-safe
   region (asserted against the shared `region.ts` expectations). impl: importer
   update + `META` doc. → B6.
7. **Docs** — update the frozen-contract block in root `CLAUDE.md` (country +
   nullable region, the country→region gating note). → B7.

## Out of scope / risks

- **Out:** any filter/sort/grouping **UID** (TB-62); reverse-geocoding beyond the
  start point; assigning a region to overseas routes; a real country picker.
- **Risk — boundary dataset accuracy/licence.** A coarse simplification could
  mis-place a start near a county border. Mitigation: keep a modest simplification
  tolerance, and use the existing labels as a cross-check (log every
  label↔geometry disagreement for eyeball review before committing the data).
- **Risk — start-point ≠ route's "home" county** for routes that begin just over a
  border. Accept for v1; the label cross-check surfaces the worst cases.
- **Risk — contract churn.** Nullable `region` touches the loader, grouping, and
  their tests; keep typecheck + all three test layers green each increment.
- **Note:** the outside-UK **filter** behaviour (what to show when country has no
  region) is explicitly TB-62's problem, not this ticket's.

## Notes

- Decisions captured on the ticket as Given/When/Then acceptance criteria
  (2026-08-13). Split from TB-62 on 2026-08-13.
