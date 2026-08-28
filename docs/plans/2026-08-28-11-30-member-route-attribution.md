# member route attribution

- Date: 2026-08-28 11:30
- Branch: member-routes-aren-t-attributed-to-their-contributor-in-the-ui
- Ticket: TB-114

## Tickets

- Resolves: https://app.notion.com/p/akdsco/Member-routes-aren-t-attributed-to-their-contributor-in-the-UI-3ca15f963d1381519c72ff6c86281013
- Refs:

## Problem / Context

Every route currently shows only its trust badge ("Verified" / "Member" / "3rd-party")
with **no indication of who contributed it**. The owner is already in the data —
`owner_name` + `owner_strava_id` are on the `Route` contract (`web/src/types.ts`,
literally commented "Not surfaced yet") and already flow through `featuresToRoutes`
(`web/src/lib/routes-data.ts`) into every component. This is a pure **presentation**
change: no data, ingest, or contract change.

Data as it stands in `public/routes.geojson` (125 routes):

- **122 of 125** carry both `owner_name` and `owner_strava_id`; **3** carry neither.
- 17 distinct owners. 86 routes are owned by the club account "Hub Velo Cycling Club"
  (its own athlete id 127889178); the rest by named individuals (Alex Booker, Robbie
  de Santos, Liam Ashton, …).
- `owner_strava_id` is a numeric string → a profile lives at
  `strava.com/athletes/{id}`.
- Some Strava display names carry a club-tag suffix (the ticket cites "Arkadiusz | HV").

Attribution is owner-driven, **not** source-driven: the criteria key on
`owner_name` existing, and owner data is present on both `club-verified` and
`club-member` routes. So we surface the contributor wherever `owner_name` exists,
regardless of trust tier, and show nothing extra when it's absent.

Rendering touches three presentational components, all of which already receive the
full `Route`:

- `RouteCard` (inside `web/src/components/RouteList.tsx`) — the list row.
- `RouteDetail` (`web/src/components/RouteDetail.tsx`) — desktop selected-route panel.
- `MobileRouteDetail` (`web/src/components/MobileRouteDetail.tsx`) — mobile sheet.

## Plan

Add a tiny pure lib `web/src/lib/contributor.ts` (unit-tested), then render its output
in the card + both detail panels. No new screen, no new dependency, no state — stays
inside frozen v1 scope.

1. **`contributor.ts` — display helpers (pure, fail-safe).**
   - `contributorName(owner_name?: string): string | null` — returns the name
     **verbatim** (trimmed only), returns `null` for absent/empty/whitespace-only so
     the UI can omit the byline cleanly (criterion 4). Per the ticket owner's call:
     **no suffix stripping / normalisation** — whatever name a contributor has is
     shown as-is (a club tag like "Arkadiusz | HV" stays).
   - `stravaProfileUrl(owner_strava_id?: string): string | null` — returns
     `https://www.strava.com/athletes/{id}` **only** when the id is all digits; else
     `null`. Digits-only guard so a malformed CDN value can't build a junk/unsafe
     link (fail-fast, mirrors the defensive stance in `routes-data.ts`).

2. **Byline on the route card.** Show "by {contributorName}" on `RouteCard`, on the
   meta row next to the source badge/region. Omitted entirely when
   `contributorName` is `null`. Non-interactive text (the card itself is the button),
   so no nested link here — the card opens the detail, and the detail carries the
   profile link.

3. **Attribution + profile link in `RouteDetail` (desktop).** Show "by {name}"; when
   `stravaProfileUrl` is non-null, render the name as an `<a>` to the athlete's Strava
   profile (`target="_blank" rel="noopener noreferrer"`, `href` via existing
   `safeHref`), with an accessible name like "View {name} on Strava". When there's a
   name but no valid id, show the name as plain text. When no name, render nothing.

4. **Attribution + profile link in `MobileRouteDetail`.** Same behaviour as (3),
   placed in the sheet's meta area.

## Behaviours — Given / When / Then

- **B1** (crit. 1) — Given a route with an `owner_name`, When a visitor views its card
  or detail, Then the contributor's name is shown ("by {name}").
- **B2** (crit. 2) — Given routes from several contributors, When a visitor browses the
  list, Then each card names its own contributor, so different contributors' routes are
  tellable apart.
- **B3** (crit. 3) — Given a route with an `owner_strava_id`, When a visitor activates
  the contributor in the detail panel, Then a link opens that athlete's Strava profile
  (`strava.com/athletes/{id}`) in a new tab.
- **B4** (crit. 4) — Given a route with no `owner_name`, When a visitor views it, Then
  no attribution is shown (no blank/"by undefined") and the card/detail renders
  normally.
- **B5** (verbatim display, ticket owner's call) — Given an `owner_name` that carries
  a club tag ("Arkadiusz | HV"), When it's shown, Then it's displayed **as-is** — no
  stripping or normalisation.
- **B6** (fail-safe) — Given a non-numeric/garbage `owner_strava_id`, When the detail
  renders, Then no profile link is built (name shown as plain text), never a junk href.

## Increments (test-first)

Each is one commit; `npm run test` + typecheck green at every step. Repo runners:
Vitest (unit `src/lib/*.test.ts`, integration `src/*.test.tsx`), Playwright e2e.

1. **contributor.ts unit (B5, B4, B6).**
   test (`src/lib/contributor.test.ts`, red): `contributorName` returns the name
   verbatim incl. a club tag ("Arkadiusz | HV" → "Arkadiusz | HV"), trims surrounding
   whitespace, returns `null` for `undefined`/`""`/`"   "`; `stravaProfileUrl` builds
   the URL for `"24005105"`, returns `null` for `undefined`, `""`, `"abc"`, `"12 3"`. →
   impl: write `contributor.ts` to pass (green).

2. **RouteCard byline (B1, B2, B4).**
   test (extend `src/components/RouteList.test.tsx`, red): a card whose route has an
   owner renders "by {name}"; a card whose route has no owner renders no "by …". →
   impl: render `contributorName` on the card meta row.

3. **RouteDetail attribution + profile link (B1, B3, B4, B6).**
   test (extend `RouteDetail.test.tsx`, red): with a valid id, the name is a link
   (`getByRole('link', { name: /strava/i })`) whose href is
   `https://www.strava.com/athletes/{id}` and opens in a new tab; with a name but bad
   id, the name is present as text with **no** such link; with no owner, no attribution
   node. → impl: render byline + conditional `<a>` in `RouteDetail`.

4. **MobileRouteDetail attribution + profile link (B1, B3, B4).**
   test (extend `MobileRouteDetail.test.tsx`, red): same assertions as (3) in the
   mobile sheet. → impl: render the same byline + link block.

## Out of scope / risks

- **Deliberately NOT building** (the ticket's open options, left for a later ticket if
  wanted): a **contributor filter**, **group-by-contributor** in the list, or a
  dedicated contributor page. All four acceptance criteria are met by the byline +
  profile link, and adding a filter/grouping/screen would trip the v1 drift tripwire.
  Flag these to the user as future options.
- No data/contract/ingest change; `owner_name` / `owner_strava_id` stay optional.
- The club account "Hub Velo Cycling Club" (86 routes) is a legitimate owner and is
  attributed truthfully like any other — not special-cased.
- Risk: name normalisation over-trimming. Kept deliberately light (only a trailing
  pipe-delimited tag) and unit-tested, so a legitimate name without a pipe is untouched.
- Risk: an `owner_strava_id` that isn't a real athlete → a 404 on Strava. We only
  guarantee the link is well-formed (digits), not that the athlete exists; acceptable.

## Notes

- Attribution shown wherever `owner_name` exists (both trust tiers), per the
  owner-keyed criteria — not gated on `source === 'club-member'`.
- Select-by-role in tests (link by accessible name), assert on semantics not copy,
  per house testing conventions.
