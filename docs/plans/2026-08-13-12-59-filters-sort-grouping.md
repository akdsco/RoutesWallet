# filters sort grouping — TB-62

- Date: 2026-08-13 12:59
- Branch: filters-sort-grouping-county-distance-elevation-filters-sort-menu-county-groups

## Tickets

- Resolves: https://app.notion.com/p/Filters-sort-grouping-county-distance-elevation-filters-sort-menu-county-groups-3bb15f963d13816e9c08fd38fbc4e9e5
- Refs:

## Problem / Context

At ~125 routes the sidebar is one long list with a single "near a place" search.
TB-62 (§G Filters spec) adds the three-operation model the design already draws:

> **filters define the pool → search ranks within it → sort orders survivors.**

Three independent operations, in that order, each with its own control and its own
exit (Clear all · search × · Back-to-N-results). It ships:

- a collapsible **filter panel** (pushes the list, never a popover),
- **county chips** (multi-select, count-ordered, zero-count dimmed not hidden) +
  a **country** chip row (only when data spans ≥2 countries),
- a hand-rolled **distance dual-handle slider** and an identical **elevation slider**,
- a **sort menu** (role=menu, radio semantics, mirrors the §C basemap popover),
- **county groups** (foldable, count-ordered, first three open, roving-tabindex kbd),
- a load-bearing **count line** ("N of M filtered"), **map reacts** (filtered-out
  routes leave the map, heat recomputes over the pool), **empty states** that name
  their own way out, **mobile** sheet filter-view, and a **shareable URL**.

### Decisions already taken on the ticket (not up for grabs)

- **Elevation is ON** (ticket "decision b"). The §G design doc predates TB-60 and
  recommends shipping elevation *disabled behind a flag*; TB-60 has since landed
  `elevation_gain_m` on **122/125** routes, so the ticket overrides the doc: the
  second slider + Flattest/Hilliest sort are enabled. The 3 non-Strava
  (RideWithGPS/Garmin) routes with no elevation are treated as "no elevation" and
  **excluded** from the elevation slider and elevation sorts.
- This is **out of frozen-v1 scope** but explicitly green-lit on the ticket (split
  from TB-58; road/gravel `route_type` is *not* in scope here).

### Dependencies / current data reality

- **County = the existing `region` field for now.** County normalisation is a
  SEPARATE data ticket worked in parallel. Today `region` is already largely
  county-shaped (Essex 60, Kent 17, Herts 12, Surrey 4, London 4, Sussex/Bucks/
  Devon/Somerset/Windsor 1 each) plus non-county buckets ("Hub Velo trips" 20,
  "Other/Ultra" 3). We build grouping + the county filter keyed on `region`; it
  gets more trustworthy when the data ticket normalises it. No code change needed
  then — same field.
- **No `country` field exists.** The country chip row only renders at ≥2 countries,
  so it stays hidden until the data ticket adds `country`. We build the machinery
  and degrade to hidden. (This keeps AC "country row when ≥2 countries" honest.)
- Distance domain in the data is **4–834 km**, elevation **16–12,859 m** — a few
  ultra/trip outliers (see Risks).

### Key files to build on

- `src/App.tsx` — owns all state; the filter/sort/fold state and the pipeline land here.
- `src/lib/grouping.ts` — `groupByRegion` (extend: order by count).
- `src/lib/search.ts` — `routesNear` (search now runs over the *filtered* pool).
- `src/lib/heat.ts` — `buildHeatIndex` (reuse the overlap count for "Most-ridden").
- `src/lib/list-nav.ts` — roving nav (extend to headers + fold in `group-nav.ts`).
- `src/components/BasemapControl.tsx` — the §C menu a11y the SortMenu mirrors.
- `src/components/{Sidebar,RouteList}.tsx` — where the panel + count line + groups go.

## Behaviours — Given / When / Then

Traced from the ticket's acceptance criteria. **Assert on proportions/labels, never
the hard-coded total** — read N from the fixture length so adding routes never breaks
a test.

- **B1 (idle).** Given no filters/search, when the app loads, then the count reads
  "N routes" (N = fixture total), the list is county-grouped with the first three
  groups open, and the map shows every route.
- **B2 (filter is a sticky pool).** Given a county + distance filter, when applied,
  then the count reads "K of N routes", the map drops non-matching routes, the heat
  recomputes over the pool, and the filter survives a subsequent search, a
  select/deselect, and a reload.
- **B3 (search within the pool).** Given active filters, when a "near <place>" search
  runs, then it ranks within the filtered pool (not the full library) and the count
  reads "Within 25 km of X · K of M filtered"; clearing the search returns to the
  filtered pool, not to everything.
- **B4 (sort follows search, then sticks).** Given a search resolves, then sort
  switches to Nearest first (announced via aria-live) and grouping suspends to a flat
  list; a manual sort chosen afterward sticks for the session and later searches
  don't override it; clearing search falls back to Name A–Z only if the rider never
  chose a sort.
- **B5 (empty state names the way out).** Given filters that exclude every route, then
  the empty state names the responsible dimension and the relaxation that would help
  ("Widening the distance range would add N routes"), with working "Clear all filters"
  and "Widen distance" actions (the latter nudges to the nearest bound that yields
  results, not a full reset).
- **B6 (keyboard).** Given keyboard only, then ↑/↓ walk group headers and cards,
  ←/→ fold/unfold, folded groups are out of the tab sequence, and the sort menu is
  reachable and operable (arrow-nav, aria-checked, Esc returns focus to the trigger).
- **B7 (shareable URL).** Given a filtered/sorted/searched view, when the URL is
  copied and reopened, then county/dist/elev/sort/near are restored and
  unknown/out-of-domain params are dropped without error; selection + fold state are
  NOT in the URL.

## Plan

Build bottom-up: pure logic (Vitest, test-first) → components (Testing Library,
select-by-role) → App wiring (integration) → URL → mobile → one E2E journey. Keep
typecheck + lint + the whole suite green at every commit. No new deps (sliders and
menu are hand-rolled; geo maths already only ever via Turf, unaffected here).

New pure modules: `lib/filters.ts`, `lib/sort.ts`, `lib/group-nav.ts`,
`lib/url-state.ts`; extend `lib/grouping.ts`, `lib/heat.ts`, `lib/list-nav.ts`.
New components: `RangeSlider.tsx`, `SortMenu.tsx`, `FilterPanel.tsx`; extend
`RouteList.tsx`, `Sidebar.tsx`, `App.tsx`, `RouteMap` wiring.

## Increments (test-first)

Each is one meaningful commit: failing test (red) → minimum to pass (green) → refactor.

**Filter core**
1. test: `applyFilters` intersects county ∧ distance ∧ elevation; routes with no
   `elevation_gain_m` are excluded once the elevation range is narrowed off-default;
   `distanceDomain`/`elevationDomain` **clamp the top to a percentile (p95) rounded
   outward to 5 and bucket outliers above it** — a range sitting at the clamped max
   means "no upper limit" (outliers included); dragging the max below it excludes
   them. Bottom rounds outward (down) to 5. → `lib/filters.ts` (types, domains,
   apply). [B2]
2. test: `countyCounts` returns each county's count under the *other* active
   dimensions (so a county can legitimately read 0 and stay visible-dimmed);
   `activeFilterCount` + `isDefault` count only non-default dims. → extend
   `lib/filters.ts`. [B2]
3. test: `biggestRelaxation` drops each dimension in turn and reports the dimension +
   how many routes it would add; `widenDistanceTarget` returns the nearest bound that
   yields ≥1 result. → extend `lib/filters.ts`. [B5]

**Sort core**
4. test: `riddenScores(routes)` gives a per-route overlap score from the heat index
   (busy-corridor routes score higher; lone routes lowest). → extend `lib/heat.ts`. 
5. test: `sortRoutes` orders by name A–Z, distance ↑/↓, nearest (via nearKm),
   most-ridden (via score), flattest/hilliest (via `elevation_gain_m`, no-elevation
   routes sorted last). → `lib/sort.ts`. [B4]
6. test: `resolveSort({hasSearch, userChoseSort, current})` — search with no prior
   user choice → nearest; a user choice sticks across later searches; clearing search
   with no user choice → name-az. → extend `lib/sort.ts`. [B4]

**Grouping + fold + nav**
7. test: `groupByRegion` orders groups by route count desc (stable tiebreak on
   first-seen). → extend `lib/grouping.ts` + update its test. [B1]
8. test: `resolveOpenGroups(orderedLabels, {manualFolds, selectedCounty,
   singleCounty})` — default first-three-open; selected route's group opens; a
   single-county filter opens that county; a manual fold/unfold overrides and is
   remembered. → `lib/grouping.ts` (or `lib/folds.ts`). [B1][B6]
9. test: `group-nav` walks header→cards→next header over open groups, skips a folded
   group's cards entirely, ←/→ resolve to fold/unfold intents, ↑/↓ clamp at ends. →
   `lib/group-nav.ts`. [B6]

**URL**
10. test: `encode`/`decode` round-trip county(slug)+dist+elev+sort+near; params omitted
    at default; unknown county + out-of-domain range dropped without throwing; fold +
    selection never encoded. → `lib/url-state.ts`. [B7]

**Components (Testing Library, select-by-role)**
11. test: `RangeSlider` exposes two range inputs labelled "Minimum …"/"Maximum …",
    5 km arrow step, Home/End to domain ends, handles can meet not cross; fires a live
    value on drag and a commit on release. → `RangeSlider.tsx`. [B2]
12. test: `SortMenu` — trigger has `aria-haspopup`/`aria-expanded`; menu is
    `role=menu` with `aria-checked` options; ↑/↓ move, Esc returns focus to trigger;
    "Nearest first" is disabled with a "needs a place" hint when no search. →
    `SortMenu.tsx`. [B4][B6]
13. test: `FilterPanel` — disclosure toggles `aria-expanded`; active state shows the
    count pill; county chip toggles `aria-pressed` and shows a tick; a zero-count
    county is rendered dimmed with its count (not removed); footer "Clear all" clears;
    country row hidden at <2 countries. → `FilterPanel.tsx`. [B2]
14. test: `RouteList` renders foldable group headers (`aria-expanded` + `aria-controls`,
    folded cards absent from the DOM), the count line phrasing, a sort row, and the
    two empty-state actions; roving nav wired through `group-nav`. → extend
    `RouteList.tsx`. [B1][B5][B6]

**App wiring (integration, mock loadRoutes/geocode/RouteMap)**
15. test: applying a filter updates the count to "K of N", drops routes from the map
    prop, and the filter survives search + select/deselect; a search then reads
    "Within 25 km of X · K of M filtered" and ranks within the pool; clearing search
    returns to the pool. → `App.tsx` pipeline + count line + `RouteMap` filtered pool. 
    [B2][B3][B4]
16. test: filters/sort/near in the URL are restored on load and re-written with
    `replaceState` on change; an unknown county / out-of-domain range loads clean. →
    `App.tsx` URL sync. [B7]

**Mobile**
17. test (App.mobile): a Filters pill leads the POI chip row (filled + count when
    active); tapping swaps the sheet to the filter view at mid snap; a "Show N routes"
    footer commits and restores; the sort row sits atop the list. → App mobile wiring
    + FilterPanel-in-sheet. [mobile AC]

**E2E**
18. Playwright (offline, stubbed): filter → search → sort → copy URL → reopen restores
    the view; keyboard reaches the sort menu and folds a group. → `e2e/*.spec.ts`. [B7]

## Out of scope / risks

**Out of scope (ticket §G.7 — decline, don't absorb):** saved filter presets ·
surface-type/traffic-free filters (that's TB-58's `route_type`) · filter-by-trust-
source · a filter summary/legend on the map · per-county counts on the map · the
`country` data itself and `region`→county normalisation (separate data ticket).

**Risks / calls to confirm at the plan gate:**
- **Slider domain outliers — DECIDED: clamp + bucket.** The data spans 4–834 km and
  15–12,860 m (a few ultra/trip outliers), so the literal spec domain would bury the
  useful band. Decision: clamp the top handle to **p95 rounded outward to 5** and
  **bucket outliers above it at the top handle** (labelled e.g. "150+ km"). A range
  resting at the clamped max = "no upper limit" (outliers included); dragging the max
  below it excludes them. Small, deliberate deviation from §G's literal wording, made
  because TB-60's real data has outliers the spec's specimen didn't.
- **Size.** This is a large ticket — ~18 commits across 4 new libs + 3 new components +
  App/mobile/URL/E2E. It can ship as one PR built in the order above, or split into
  **(1) desktop filters+sort+groups** then **(2) URL + mobile + E2E**. Proposed: one
  PR, sequenced; open to splitting if you'd rather review in two.
- **Most-ridden semantics.** "Reuses the heat overlap count" — I'll define the
  per-route score as the sum of its unique segments' overlap counts at a fixed cell
  size, tested against a known-overlap fixture. Flag if you had a specific definition.
- Map rendering / actual pixels stay verified by eye (per web/ baseline) — the heat
  recompute-over-pool is asserted at the data layer, not by screenshot.

## Notes

- Elevation ENABLED per ticket decision b (design doc's "disabled flag" is superseded).
- County keyed on `region` today; upgrades for free when the county data ticket lands.
