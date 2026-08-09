# search-select — the search & selection experience

Worktree for **TB-52 + TB-53 + TB-54** (one coherent unit — they all live in the
search/select flow and share `App.tsx` + RouteMap view state).

- TB-52: https://app.notion.com/p/Search-view-feels-locked-re-fits-snaps-back-on-zoom-3b515f963d1381989ee5e2c231b25a09
- TB-53: https://app.notion.com/p/Selected-route-detail-panel-Google-Maps-style-not-list-scroll-3b515f963d138168bf43eb71fccc3d8e
- TB-54: https://app.notion.com/p/Legend-is-wrong-in-search-mode-heat-gradient-no-longer-applies-3b515f963d1381008920cd5b41a05e6c
- Base: `main` @ a808ca4

## Problems

**TB-52 — search view feels locked.** After a "near <place>" search fits to the
matches + 25 km radius, zooming in snaps the view back out to the search extent —
it feels locked in search mode. Expected: fit **once** when the search resolves,
then free zoom/pan (search filter + radius can stay; only the view-fit is
one-shot). Leads: the fit-to-matches effect (deps `[searchPoint]`) should be
one-shot; check nothing re-fits on zoomend/moveend or on the smooth-zoom commit
(`setZoomAround` fires move/zoom + bumps `setViewTick`/`setZoom`).

**TB-53 — selected-route detail panel.** Clicking a route surfaces almost no
context (only an inline "Open in Strava" in the list card + a transient hover
card). Want a persistent, Google-Maps-style detail card on click: name, distance,
region, trust badge, cafe/notes, "Open in Strava". Explicitly **not** list-scroll.
Options: floating card / bottom sheet / promote the hover card into a pinned card.

**TB-54 — legend wrong in search mode.** In search mode the heat flattens and
matched routes render black, so the "1 → many rides" heat-gradient legend is
misleading. Make it context-aware (idle = heat gradient; search = "matched route"
+ "25 km radius" key).

## Key files
- `web/src/App.tsx` — search state, legend block, hover/selection card
- `web/src/components/RouteMap.tsx` — fit effects, matched/active rendering
- `web/src/components/Sidebar.tsx` — RouteCard (selection)

## Coordination
- **TB-53 detail panel ↔ `mobile` (TB-49):** the mobile bottom-sheet is where the
  detail panel renders on phones — build the detail card as a reusable component
  and coordinate with the `mobile` worktree (share it; agree which lands first).
- **Legend ↔ `heat` (TB-51):** both touch the `App.tsx` legend block — whoever
  merges first, the other rebases.

## How to work here
- `cd web && npm ci` first.
- Test-first for pure logic; map/UI verified by eye (say so honestly). Small commits.
- Full gate before push: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`.
- Open a PR into `main` when done — the user merges.
