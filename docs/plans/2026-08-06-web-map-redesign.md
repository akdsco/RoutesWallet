# web map — design v1 implementation

- Date: 2026-08-06
- Branch: web-map (continuation; work in flight — no new worktree)

## Problem / Context

The scaffolded map worked but the UI was baseline Claude-Code output: raw OSM
raster (busy), matched routes overlaid at equal weight (no hierarchy). The user
took it to Claude Design and returned with a full spec ("RoutesWallet Web
version-1", source in session scratchpad `design-v1/RoutesWallet Web.dc.html`):
token system (light+dark), Inter + IBM Plex Mono, 392px sidebar + map, route
cards with geometry thumbnails, three route states (idle→matched→selected) by
weight+lightness not hue, CARTO Positron basemap, segment-counting heat, plus a
greenspace/AONB overlay.

Grounding vs real data (6 routes): heat won't visibly read yet (routes scattered,
half in Spain, no shared corridors) — the ~100-route club library (mostly
Sussex/SE) is pending and will make it read. See memory `whatsapp-route-extraction`.

## Decisions (user, 2026-08-06 — override some frozen non-goals by explicit say-so)

- Greenspace/AONB overlay: IN v1.
- Metadata: surface region + notes/cafe on cards (crosses old cafe non-goal).
- Dark mode: IN v1 (toggle + persistence).
- Selection model: click = select + fit map; explicit "Open in Strava" button is
  the exit (exit unchanged).

No new npm dependency required for the core (Turf already in; heat is segment
counting, not leaflet.heat; CARTO is a tile URL).

## Plan — desktop first, in increments

1. **Foundation** — design tokens (CSS vars, light + `[data-theme=dark]`), Inter +
   IBM Plex Mono, swap OSM tiles → CARTO Positron (light_all / dark_all, retina),
   attribution "© OpenStreetMap contributors © CARTO". Verify by eye.
2. **Type contract + pure helpers (test-first)** — extend Route with region,
   notes, cafe (+ optional route_type). Pure fns with Vitest: `routeThumbnail`
   (bbox-fit polyline to 52×36), `segmentHeatTiers` (per-segment overlap count →
   tier), `groupByRegion` / nearest-first sort.
3. **Sidebar** — header + search box (design styling, states), route cards
   (thumbnail, name, mono dist, HV/3rd-party badge, region/cafe meta), region
   grouping with sticky headers idle / flat nearest-first after search.
4. **Map route states** — panes + halos; idle heat, matched (ink+halo), selected/
   hover (blue, front, start dot); bidirectional hover card ↔ line; 14px hit
   strokes; click = select + fitBounds; selected card expands → notes + Strava btn.
5. **Search & empty states + a11y** — loading skeleton, geocode-fail, no-match,
   empty; aria-live result count; card keyboard nav (role=button, Enter/Space,
   arrows), focus rings.
6. **Dark mode** — theme toggle + persistence; dark CARTO tiles.
7. **Greenspace/AONB overlay** — prebake OSM landuse (forest/wood, park) + Natural
   England AONB/National Park boundaries to a simplified static GeoJSON
   (mapshaper), draw in a canvas pane below routes. Keyless, no server.

Test-first for pure logic (increment 2 + any parse/sort); map/UI by eye.
One logical change per commit; typecheck + lint + format + tests green each step.

## Notes

- Greenspace + dark + cafe are opted-in overrides of CLAUDE.md non-goals — recorded
  in memory `web-map-redesign-v1`.
- Fonts via Google Fonts for now (matches design); self-hosting is a later option.
