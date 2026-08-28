# strava sign in flow

- Date: 2026-08-28 16:13
- Branch: strava-connect-is-cryptic-anonymous-make-it-a-real-sign-in-with-strava-flow

## Tickets

<!-- The ticket(s) this plan's PR RESOLVES vs merely REFS (coordination). Paste the
     Notion URL(s); the machine keys on the UUID in the URL. /ship links the PR +
     marks In progress; /cleanup closes Resolves to Done on merge. Refs are never
     auto-closed. The TB-xx label is optional human sugar. -->

- Resolves: https://app.notion.com/p/akdsco/Strava-connect-is-cryptic-anonymous-make-it-a-real-Sign-in-with-Strava-flow-3ca15f963d1381589677d5ed0307c9e6
- Refs: TB-110 (the member pool this builds on), TB-114 (contributor attribution — display pair of the my-routes view)

## Problem / Context

TB-116. After a member clicks **Connect Strava** today the flow is cryptic and
anonymous:

- **Frozen blank.** `/connect/callback` exchanges the code **and** synchronously
  pulls + county-normalises ~100 routes before it redirects home — several
  seconds where the browser sits on a blank redirect with no feedback.
- **Forgettable success.** Success is a tiny line under the button; the count in
  `?connect=ok&added=N` is already in the URL but the copy never names it.
- **No memory of "you".** Identity is a per-browser `localStorage`
  `rw:strava-contributed` flag (`strava-connect.ts`). It resets per browser /
  subdomain, and re-clicking silently re-runs the whole slow pull. The app has no
  notion of the signed-in athlete even though the token exchange already
  authenticates them and every route is owner-stamped (`owner_strava_id` /
  `owner_name`).

**What exists to build on** (all present today):

- `functions/connect/callback.ts` → `handleConnect` (`src/lib/connect-handler.ts`,
  boundaries injected, unit-tested) → `exchangeToken` / `fetchAllRoutes`
  (`src/lib/strava-api.ts`, `fetch` injected). `exchangeToken` returns
  `{ accessToken, athleteId }` — the Strava response also carries the athlete's
  `firstname`/`lastname` (name), not yet captured.
- Routes load from `/api/routes` (`functions/api/routes.ts` → D1 pool) via
  `loadRoutes` → `featuresToRoutes`, which already surfaces `owner_strava_id`.
- Client CTA `src/components/ConnectStrava.tsx` + pure helpers
  `src/lib/strava-connect.ts`. Filter model in `src/lib/filters.ts` +
  `applyFilters` wired in `App.tsx`.
- Env bindings `functions/_lib/env.ts` (`DB`, `STRAVA_CLIENT_ID`,
  `STRAVA_CLIENT_SECRET` — secrets in Cloudflare vars only).

**Scope note (conscious):** this is a deliberate step up from TB-110's anonymous
pool into **lightweight persistent identity** — a signed session cookie, **no
user/club table**, **no long-term token storage**. Anything past that narrow path
(relational membership, refresh tokens, multi-device sync, per-route editing) is
out of scope per CLAUDE.md.

## Plan

**Identity = a signed, httpOnly session cookie holding only `{ athleteId, name }`**
(HMAC-SHA256 via WebCrypto, new Cloudflare env var `SESSION_SECRET`). No token, no
secret, no per-user table. `/api/me` reads it → `Signed in as <name>`;
`/connect/logout` clears it. "My routes" is then a client-side filter on the
`owner_strava_id` already stored per route.

**Progress + count = split the slow pull off the redirect.** Callback exchanges
the token fast, sets the identity cookie, and redirects home **instantly**; the
several-second route pull moves to a **separate sync step the UI drives and shows
a spinner for**, then names the count.

**KEY DECISION — how the sync step reaches the Strava access token** (see the AC
"no Strava secret or token is exposed to the browser"). Two viable shapes; the
increments below are written for **Approach A** and note the Approach-B delta.
This is the one point I want your call on before building.

- **Approach A (recommended) — client-driven sync, token in a short-lived
  httpOnly cookie.** Callback also sets an encrypted, httpOnly, ~5-min `rw_sync`
  cookie carrying the access token and redirects `?connect=start`. The app (signed
  in + `start`) shows a progress indicator and `POST`s `/connect/sync`; that
  Function reads the token from its httpOnly cookie, pulls + ingests, returns
  `{ added, skipped }`, and expires the cookie. **Pros:** a real spinner for the
  true duration and an **authoritative** added-count (nails AC1 + AC2); token is
  httpOnly (never readable by page JS) and single-use. **Con:** the token
  transits the cookie jar briefly — defensible as "not exposed to the browser"
  (no script can read it), but it is the looser reading of that AC.
- **Approach B — server background ingest, no token anywhere in the browser.**
  Callback runs the pull via `context.waitUntil(...)` after redirecting instantly
  (`?connect=syncing`); the app shows "Syncing in the background…" and refetches
  `/api/routes` until its owned routes appear. **Pros:** strictly no token in the
  browser (tightest AC6). **Con:** no crisp live progress or authoritative count —
  AC2's "unmissable result naming how many" becomes best-effort (poll the pool).

## Increments (test-first)

<!-- Ordered, commit-sized steps. Each becomes one meaningful commit. -->
<!-- For each: test: <behavior to assert> (red) -> impl: <change that passes it> (green). -->

1. **Session sign/verify lib** (→ AC3, AC6). test (`src/lib/session.test.ts`):
   `signSession({athleteId,name}, secret)` round-trips through
   `verifySession(cookieValue, secret)`; a tampered payload, a tampered signature,
   and a wrong secret each verify to `null`. → impl `src/lib/session.ts` (WebCrypto
   HMAC-SHA256, base64url `payload.sig`). Pure, no I/O.

2. **Capture athlete name at token exchange** (→ AC3). test (`strava-api.test.ts`):
   `exchangeToken` returns `athleteName` built from the response
   `athlete.firstname`/`lastname` (trimmed; id-only fallback). → impl extend the
   return type + parse; thread `athleteName` through `handleConnect` /
   `ConnectDeps`.

3. **`/api/me` + `/connect/logout`** (→ AC3, AC5). test: a `readSession(request,
   secret)` handler-lib returns `{signedIn:true, athleteId, name}` for a valid
   cookie and `{signedIn:false}` for none/invalid; logout returns a `Set-Cookie`
   that expires the session. → impl `functions/api/me.ts`, `functions/connect/logout.ts`,
   sharing a `_lib/session-cookie.ts` reader; add `SESSION_SECRET` to `env.ts`.

4. **Callback: instant redirect + identity cookie + sync-token cookie** (→ AC1,
   AC6; Approach A). test: given a stub token exchange, the callback issues a 302
   to `/?connect=start`, sets the signed identity cookie and the httpOnly `rw_sync`
   cookie, and does **not** pull routes. → impl refactor `connect/callback.ts` to
   stop calling the ingest; set cookies; redirect `start`. (Approach B: no
   `rw_sync`; `context.waitUntil(ingest)`; redirect `syncing`.)

5. **`/connect/sync` ingest endpoint** (→ AC1, AC2, AC6; Approach A). test: the
   sync handler-lib, given the `rw_sync` token cookie + injected boundaries,
   pulls + ingests and returns `{ added, skipped }`, then clears the cookie;
   missing/expired cookie → 401 (not a silent success). → impl
   `functions/connect/sync.ts` reusing the existing `handleConnect` ingest half.
   (Approach B: this increment folds into #4's `waitUntil`.)

6. **ConnectStrava rework: signed-in UI + progress + unmissable count** (→ AC1,
   AC2, AC3, AC5). test (`ConnectStrava.test.tsx`, mock `fetch`): when `/api/me`
   says signed in, shows "Signed in as <name>", a **Sign out**, and a "Sync more"
   action (no auto-pull → AC3); on `?connect=start` shows a `role="status"`
   progress ("Syncing your routes…"), then after `/connect/sync` resolves shows a
   `role="status"` result naming the count ("Added N routes"); Sign out calls
   `/connect/logout` and clears the signed-in UI. → impl the component; retire the
   `localStorage` `hasContributed` gate in favour of the real session.

7. **"My routes / All routes" scope toggle** (→ AC4). test: pure
   `scopeRoutes(routes, mine, athleteId)` keeps only `owner_strava_id === athleteId`
   when `mine`; App integration test — a signed-in member toggling the control
   sees only their routes, then all club routes again. → impl a segmented control
   (accessible role + state, gated on signed-in) in the sidebar; narrow `routes`
   before `applyFilters`; refetch `/api/routes` after a sync completes so freshly
   added routes appear (the pool has a 60s CDN cache).

8. **E2E journey + docs** (→ all). test (`e2e/*.spec.ts`, fully stubbed/offline):
   sign in → progress → count → toggle my-routes → sign out, pool still shows club
   routes. → impl the stubs; document the new `SESSION_SECRET` Cloudflare var and
   the flow in `web/`'s notes.

## Notes

- **New env var:** `SESSION_SECRET` (Cloudflare Pages var, never committed) — the
  HMAC key for the session cookie. Rotating it signs everyone out; acceptable.
- **Cookies on the OAuth return:** the callback is a top-level GET redirect, so
  `SameSite=Lax; Secure; HttpOnly` cookies are set correctly on return, and the
  subsequent same-site `POST /connect/sync` sends them.
- **Client-id runtime source:** `ConnectStrava`'s `DEFAULT_STRAVA_CLIENT_ID`
  comment pins the "move connect config to a runtime source" note on TB-116. It is
  adjacent, not core to the flow — **left out of scope** unless you want it folded
  in (it would fall out naturally alongside `/api/me`).
- **Out of scope (say no):** relational user/club model, refresh-token storage,
  long-lived token persistence, multi-device session sync, per-route editing,
  share-consent. Anything here → stop and ask.
- **Risk:** the Approach-A token-in-httpOnly-cookie reading of AC6 — the decision
  above. If you prefer the strict reading, we take Approach B and accept a
  best-effort count.
