# mobile filters sheet no way back to the map user gets trapped

- Date: 2026-08-14 09:01
- Branch: mobile-filters-sheet-no-way-back-to-the-map-user-gets-trapped

## Tickets

<!-- The ticket(s) this plan's PR RESOLVES vs merely REFS (coordination). Paste the
     Notion URL(s); the machine keys on the UUID in the URL. /ship links the PR +
     marks In progress; /cleanup closes Resolves to Done on merge. Refs are never
     auto-closed. The TB-xx label is optional human sugar. -->

- Resolves: https://app.notion.com/p/Mobile-Filters-sheet-no-way-back-to-the-map-user-gets-trapped-3bc15f963d138166b7b5f1b962666ded
- Refs:

## Problem / Context

TB-66. On mobile (phone width, `< 768px`), opening the Filters view in the bottom
sheet **traps the user** — there is no on-screen way back to the map/list short of
a page reload. Reported from real use.

Root cause (traced in code):

- The sheet (`BottomSheet.tsx`) is a single `height: 100dvh` element translated
  **down** so only the top `snapHeights(vh)[snap]` px is visible; content flows
  down from the handle and everything past that height sits below the fold.
- `MobileFilterSheet.tsx` lays itself out as `flex h-full flex-col` with the
  "Show N routes" commit button **pinned to the bottom of that full-height (100dvh)
  element**. So at every snap the footer lands ~`(100dvh − snapHeight)` px *below*
  the visible window — off-screen, exactly as reported.
- `RouteDetail` avoids this precisely because it has **no** bottom-pinned footer:
  its "Open" action rides inside the scroll body and the `DETAIL_PX` snap floor is
  sized so it's visible without scrolling (§F). The filter form can't copy that —
  its body scrolls and the design wants a *pinned* commit footer.
- The design (§G.6 / §F) specifies **two** exits from the filter form: (a) the
  footer "Show N routes" commit button, and (b) **re-tapping the Filters pill**.
  Today (a) is off-screen and (b) is broken — the pill's `onClick` is
  `openMobileFilters`, which only ever *opens*; it never toggles closed. Filters
  are sticky, so "Clear all" is deliberately **not** an exit.

Relevant code:

- `web/src/components/BottomSheet.tsx` — owns the handle + snap geometry; the
  `height: 100dvh` translate model.
- `web/src/components/MobileFilterSheet.tsx` — the pinned commit footer.
- `web/src/App.tsx` — `openMobileFilters` / `closeMobileFilters`, the Filters pill,
  the `<BottomSheet>` render.
- `web/src/lib/sheet.ts` — `snapHeights` / `snapsFor` snap maths (unit-tested).

Layers to use (per `web/` conventions): the footer-in-viewport proof is genuinely
a **layout** fact jsdom can't measure, so it lives in the Playwright **mobile**
E2E (`e2e/mobile.spec.ts`, which already asserts `toBeInViewport()` on the detail
"Open" button — direct precedent). The pill-toggle logic and the sticky "Clear
all" guard are cheapest and honest at the **integration** (App, jsdom) layer.
`sheet.ts` gets the pure snap→content-height maths as a **unit**.

## Plan

Deliver the two design exits without changing the map-primary list/detail
behaviour:

1. **Constrain the filter view to the visible snap window** so the pinned commit
   footer lands at the screen's bottom edge. Since `BottomSheet` owns the handle
   and snap geometry, add an **opt-in** prop (e.g. `constrainToSnap`) that caps the
   children region to `snapHeights(vh)[snap] − HANDLE_PX`; App passes it **only in
   filter mode**. The list/detail keep the current 100dvh fill, so peek's
   drag-to-reveal choreography is untouched. `HANDLE_PX` (the handle is
   `min-h-11` = 44px) and a pure `visibleContentPx(vh, snap)` helper go in
   `sheet.ts`, unit-tested.
2. **Make the Filters pill a toggle** — `onClick` opens when closed and calls
   `closeMobileFilters` when open (restoring the pre-filter snap), and the pill
   carries `aria-expanded` reflecting open/closed (assert on the semantic state,
   not the copy).
3. Lock in that **"Clear all" stays open** (sticky filters) with a guard test.

No new dependency, no new screen, no new concept — a bug fix on the existing
sheet pattern. Within v1 scope and the frozen data contract.

## Behaviours — Given / When / Then

- **AC1 — footer commit is on-screen and exits to the map/list.**
  *Given* the app at phone width with the Filters view open, *When* the sheet
  rests at its opening snap, *Then* the "Show N routes" button is within the
  viewport, *And* tapping it closes the filter view and returns to the route list
  at the pre-filter snap.
- **AC2 — re-tapping the Filters pill closes the filter view.**
  *Given* the Filters view is open, *When* the user taps the Filters pill again,
  *Then* the filter view closes and the route list is shown at the pre-filter
  snap, *And* the pill's `aria-expanded` reflects open vs closed.
- **AC3 — "Clear all" is not an exit (sticky filters).**
  *Given* the Filters view is open with active filters, *When* the user taps
  "Clear all", *Then* the selections clear but the filter view stays open.

## Increments (test-first)

<!-- Ordered, commit-sized steps. Each becomes one meaningful commit. -->
<!-- For each: test: <behavior to assert> (red) -> impl: <change that passes it> (green). -->
<!-- Prose/config with no unit surface: verify by a presence/validity check, stated honestly. -->

1. **Snap→content-height maths (unit).** — *serves AC1*
   test (`src/lib/sheet.test.ts`, red): `HANDLE_PX` is the handle height and
   `visibleContentPx(vh, snap)` returns `snapHeights(vh)[snap] − HANDLE_PX` for
   each snap. → impl: add `HANDLE_PX` constant + `visibleContentPx` to `sheet.ts`.

2. **Footer commit is on-screen and exits to the list (E2E — the honest layer for a layout fact).** — *serves AC1*
   test (`e2e/mobile.spec.ts`, red): at phone width, open Filters via the pill →
   the "Show N routes" button `toBeInViewport()`; tap it → filter view closes, the
   route list is shown, sheet settled at the pre-filter snap. → impl: add an opt-in
   `constrainToSnap` prop to `BottomSheet` that caps the children region to
   `visibleContentPx(vh, snap)` (explicit height instead of `flex-1`); App passes
   it only when `mobileFiltersOpen`. The prop is plumbing between the unit (inc 1)
   and this E2E; jsdom has no layout so it can't honestly prove "on-screen" — the
   E2E is that proof (same `toBeInViewport()` layer already used for RouteDetail's
   "Open"). List/detail keep the 100dvh fill (default, unchanged).

3. **Filters pill toggles the view closed (integration).** — *serves AC2*
   test (`src/App.test.tsx`, red): open Filters via the pill (filter body shows);
   the pill is `aria-expanded=true`; tap it again → filter body gone, route list
   back, pill `aria-expanded=false`. → impl: pill `onClick` toggles
   open/`closeMobileFilters`; add `aria-expanded={mobileFiltersOpen}`.

4. **"Clear all" keeps the view open — sticky filters (integration guard).** — *serves AC3*
   test (`src/App.test.tsx`, red-or-characterising): open Filters, activate a
   county, tap "Clear all" → selection cleared but the filter body is still shown.
   → impl: none expected (guards current intent); if already green, note it as a
   regression guard, not new behaviour.

Each increment is one commit; the whole suite + `tsc` + lint/format stay green at
every step. Finish with `/ship`.

## Out of scope / risks

- **Not** adding a header close/back affordance — the design deliberately gives
  only the two exits (footer + pill) and keeps filters sticky. Adding a third exit
  would drift from §G.6.
- **Not** changing list/detail snap behaviour — the constraint is opt-in and only
  applied in filter mode, so map-primary peek/drag choreography is untouched
  (guarded by the existing `mobile.spec.ts` snap tests).
- Risk: the constrained height must follow snap changes (drag mid→full). It's
  derived from `snap` state, which re-renders the sheet on settle — consistent
  with how the sheet already re-rests on snap change; live-during-drag resize is
  not required (settles correctly on release).
- Risk: `HANDLE_PX` couples to the handle's `min-h-11`. Naming it a constant next
  to the other snap tunables keeps the coupling explicit and one place to change.

## Notes
