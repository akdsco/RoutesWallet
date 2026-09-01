# account + strava sync redesign

- Date: 2026-09-01 15:58
- Branch: strava-connect-is-cryptic-anonymous-make-it-a-real-sign-in-with-strava-flow
- Follows: TB-116 (this same PR #20 — the sign-in flow). This is the fuller
  account/sync UX layered on top of it.

## Tickets

- Resolves: (TB-116 — same PR; a dedicated TB-1xx ticket for this redesign is
  optional — offer to create one)
- Refs: TB-110 (the member pool)

## Problem / Context

TB-116 gave us a working sign-in: a `Connect Strava` card, real OAuth
(`/connect/start` → `/connect/callback` → `/connect/sync`), a signed identity
cookie, `/api/me`, logout, and a My/All routes toggle. The **design**
(`~/Downloads/RoutesWallet/RoutesWallet Web version- strava-login-v1`,
`RoutesWallet Account.dc.html`, Section I) is the fuller account experience the
current card only gestures at. **Where the design and this plan disagree, the
design wins.**

**Locked decisions (this session):**

- **Lands on this branch / PR #20** (extends the sign-in flow rather than a
  follow-up PR).
- **Frontend-first, thin backend, DB-ready.** Reuse the current single-call
  server sync; build the full UX; no cross-reload/resumable sync and no per-route
  geometry+elevation pull yet. Structure everything so a real DB + background job
  slots in without a rewrite.

**The design's five-state arc:**

1. **Signed out** — Strava's official "Connect with Strava" button under the
   search hint (the only place it appears).
2. **Authorising** — Strava's page (redirect; already built).
3. **First sync** — a progress panel that **replaces the list**, dismissible to a
   slim **strip** that keeps running in-session.
4. **Summary** — "Your routes are in — Added N · Updated N · Already in the
   library N" → "See my routes".
5. **Steady state** — **no Connect button**; an **avatar** takes the theme
   toggle's corner (theme moves into its menu); sync lives in **Settings**.

## Behaviours — Given / When / Then

- **B1 Avatar replaces the corner when signed in.** _Given_ a signed-in member,
  _when_ the sidebar renders, _then_ the top-right slot shows their avatar (Strava
  photo, else two-letter initials — never a generic glyph) with the signed-in
  ring; _and_ the theme toggle has moved into the avatar menu. Signed out, the
  slot keeps the theme toggle and shows the Connect button.
- **B2 Avatar menu.** _Given_ the avatar, _when_ opened, _then_ a `role=menu`
  popover shows identity (name + "Strava connected" ✓), Settings, Sign out, and a
  three-way Appearance segment (Light/Dark/System). No "Sync now" here. Esc closes
  and returns focus to the avatar.
- **B3 First-sync panel.** _Given_ a member returns from a successful connect,
  _when_ the sync runs, _then_ a panel **replaces the list** showing visible
  progress ("Bringing in your routes…"), _and_ it can be **Hidden** to a strip
  (sync keeps running in-session) or **Stopped** (cancels; already-added stay).
- **B4 Summary.** _Given_ the sync completes, _when_ it lands, _then_ the panel
  shows an itemised count (Added / Updated / Already in the library) and a **See
  my routes** action that switches to the My-routes view; a partial result reads
  "N added · M couldn't be read → Try those again".
- **B5 Strip.** _Given_ the panel was Hidden mid-sync, _when_ the list shows,
  _then_ a 38px strip sits atop it with a live indicator + **View** to reopen; on
  completion it becomes the summary strip and auto-dismisses after ~8s.
- **B6 Settings panel.** _Given_ a signed-in member, _when_ they open Settings,
  _then_ a panel **replaces the list** with a **Strava** group (Sync now +
  "Last synced … · N of yours" sub-line; Connected account + **Disconnect**) and
  an **Appearance** group (Theme, Units km/mi). Mid-sync the Sync button is a
  disabled "Syncing" and the sub-line carries the live count.
- **B7 Disconnect vs Sign out.** _Given_ Settings, _when_ Disconnect is chosen,
  _then_ it confirms inline ("Disconnect? Your N routes stay in the library.") and
  ends the session; Sign out (in the avatar menu) also ends the session. (v1: both
  clear our cookie; true Strava de-authorisation is deferred — see Backend.)
- **B8 Units.** _Given_ the Units toggle, _when_ switched to mi, _then_ distances
  render in miles across the app; the choice persists per browser.

## Increments (test-first)

Grouped; each bullet is a commit-sized step, test-first (Vitest/RTL unit +
integration, Playwright E2E for the journeys). Behaviours in brackets.

**Backend (thin) first — the data the UI needs:**

1. **Athlete photo through the session** (→ B1). test: `exchangeToken` returns
   `athletePhoto` from Strava's `athlete.profile`; it rides the signed cookie and
   surfaces in `/api/me` (`{ signedIn, athleteId, name, photo? }`). → impl thread
   it through `strava-api` / `session` / `session-cookie` / `me.ts`.
2. **Added-vs-Updated counts** (→ B4). test: the store reports, per sync, how many
   ids were **new** vs **already present** (query existing ids before upsert →
   `{ added, updated }`); `syncConnectedRoutes` returns `{ added, updated, skipped }`.
   → impl extend `store` + `connect-handler`; `/connect/sync` returns the richer
   shape. (Keeps list-only; no geometry/elevation pull.)
3. **"N of yours"** (→ B6). test: a helper counts pool routes owned by the athlete
   (`owner_strava_id === me`); exposed for the Settings sub-line. → impl a pure
   selector reused by the My-routes filter.

**Frontend — the five states:**

4. **Avatar + menu** (→ B1, B2). test (RTL): signed-in renders an avatar button
   (role+name, photo/initials) in the corner; menu opens with identity, Settings,
   Sign out, Appearance segment; theme changes via the segment; signed-out keeps
   the theme toggle. → impl `Avatar` + `AccountMenu`; move the existing theme
   toggle into the menu; wire `session` from App.
5. **Signed-out CTA = official Strava button** (→ signed-out state). test: the CTA
   links to `/connect/start` and uses Strava's official "Connect with Strava"
   asset (brand-locked; placeholder until the asset lands). → impl replace the
   current orange button; keep the "we only read your routes" sub-line.
6. **Sync progress panel + strip** (→ B3, B5). test (RTL): on `?connect=start`,
   a panel replaces the list with progress; Hide → a strip atop the list (sync
   promise keeps running in-session); Stop → cancels. → impl a `SyncPanel` +
   `SyncStrip` driven by the in-flight `runSync()` promise. **A proper loading
   treatment, not a bare text line:** a titled panel with an animated indeterminate
   bar + a few shimmering **skeleton route rows** that convey "the library is
   filling", respecting `prefers-reduced-motion`. Built so a real progress stream
   (a determinate "N of M" bar) slots into the same shell later.
7. **Sync summary** (→ B4). test: on resolve, the panel/strip shows Added /
   Updated / Already-in counts + "See my routes" (switches scope to mine) + Done;
   a partial result shows "Try those again". → impl `SyncSummary`; auto-dismiss
   the strip after ~8s.
8. **Settings panel** (→ B6, B7). test: opens over the list; Strava group (Sync
   now + last-synced sub-line, Connected account + Disconnect-with-inline-confirm);
   Appearance group (Theme, Units). Mid-sync the Sync button is disabled "Syncing".
   → impl `SettingsPanel` reusing the replace-restore mechanic; last-synced from
   `localStorage`, "N of yours" from the pool selector.
9. **Units** (→ B8). test: `formatDistance(km, units)` renders km or mi; the toggle
   persists (localStorage) and re-renders distances app-wide. → impl a `units`
   context/state threaded into the existing distance formatting.
10. **E2E journeys + docs.** test (Playwright, stubbed/offline): signed-out CTA →
    (stubbed) return → sync panel → summary → avatar steady-state → open Settings →
    Sync now → Disconnect. → impl stubs; document the new `/api/me` photo field and
    the deferred backend pieces in `docs/DEPLOYMENT.md`.

## Backend touchpoints + what's deferred (frontend-first)

- **Kept thin now:** photo in the cookie, added/updated counts from an
  existing-ids check, "N of yours" from the pool. All fit the current
  cookie+D1+KV shape — no new table.
- **Deferred (needs real backend, flagged not built):**
  - **Resumable / server-side-durable sync** across reload/closed-tab (the strip
    reopening after a reload). v1 sync is one in-session call; the panel/strip live
    only while the tab does. The `SyncPanel` shell is built to accept a real
    progress stream + a server job id later.
  - **Two-phase counted progress** ("142 of 226", ETA) — needs the sync to stream
    per-route progress. v1 shows a designed indeterminate loading state (animated
    bar + shimmering skeleton rows), not a determinate count.
  - **Per-route geometry + elevation pull** (design's phase 2) — still list-only
    (TB-110's deferral holds).
  - **True Strava de-authorisation** on Disconnect — we deliberately don't store
    the access token, so we can't call Strava's deauthorise endpoint later. v1
    Disconnect clears our session (with the design's confirm copy) and the sub-copy
    can point riders to revoke at strava.com/settings/apps. Real deauth needs a
    stored (revocable) token — a DB decision.
  - **Sync mirroring deletes** — per the design's own call: **no**, not v1. Sync
    counts additions + updates only.

## Out of scope / risks

- **Out of scope (design §I.5 "not designed"):** auto-sync schedules, per-route
  opt-in, editing your own routes, private routes, club membership/roles.
- **Risk — PR size.** This meaningfully grows PR #20 (already reviewed + green);
  it will re-enter review. Deliberate, per the "extend the branch" decision.
- **Risk — Strava brand asset.** The official "Connect with Strava" button + the
  avatar's Strava-photo usage must follow Strava's brand guidelines; placeholder
  until the assets are in.
- **Risk — the panel-replaces-list mechanic** is now shared by route detail,
  filters, sync, **and** settings. Keep one mechanism, not four.

## Copy (verbatim from the design)

- Connect sub-line: "Bring your own routes into the club library. We only read
  your routes — nothing is posted to Strava."
- Phase/progress: "Bringing in your routes…" (v1 indeterminate).
- Done: "Your routes are in — Added N · Updated N · Already in the library N".
- Partial: "N added · M couldn't be read → Try those again".
- Nothing found: "No routes found in your Strava account. We read saved routes,
  not activities."
- Disconnect confirm: "Disconnect? Your N routes stay in the library."
- Settings sub-line: "Last synced … · N of yours".
- Club-agnostic throughout — "the club library", never a club name.
