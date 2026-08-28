# map basemap api key watermark

- Date: 2026-08-27 17:34
- Branch: map-basemap-shows-api-key-required-watermark-across-the-whole-map
- Ticket: TB-113 (Web / RoutesWallet)

## Tickets

- Resolves: https://app.notion.com/p/akdsco/Map-basemap-shows-API-KEY-REQUIRED-watermark-across-the-whole-map-3c915f963d1381bc979cc97fee1bd98f
- Refs:

## Problem / Context

The "Standard" basemap renders a repeating **"API KEY REQUIRED — carto.com/basemaps/apikey"**
watermark across the whole map, in both light (CARTO Voyager) and dark (CARTO Dark
Matter). CARTO moved their **raster** basemap tiles behind a required free-tier API
key; keyless requests are now watermarked (confirmed via CARTO docs + the
home-assistant/core#180277 report). Our tile URLs in `web/src/lib/basemaps.ts`
(`voyager` / `dark_all`) are keyless, so every visitor — live prod included — sees a
defaced map. Vector tiles are unaffected, but our stack is fixed to **Leaflet + raster**
(architecture invariant), so vector is out of scope.

**Direction (agreed with user):** keep the Voyager / Dark Matter look — the
landcover-baked basemap the design rests on — and authenticate it with a **free CARTO
API key** supplied at build time via a Cloudflare Pages env var. The key is a public,
domain-restricted basemap key (email + domain, no account); it is **never committed** —
it lives in Cloudflare env for prod and a gitignored `.env.local` for dev, honouring the
static-site / no-secrets invariant. CyclOSM stays as the already-shipping keyless option.

Relevant facts:

- `basemaps.ts` is pure config + a `tileConfig(id, theme)` resolver; `RouteMap.tsx`
  builds the Leaflet `L.tileLayer` from it (`RouteMap.tsx:265-278`).
- No `import.meta.env` is used anywhere yet — this is the app's first env var.
- Root `.gitignore` already ignores `.env` / `.env.*` (keeps `.env.example`), so
  `.env.local` is safe with no gitignore change.
- E2E runs offline/stubbed (no real tiles fetched), so CI needs no key.

## Plan

Thread an optional API key into the CARTO tile URLs, read from
`import.meta.env.VITE_CARTO_BASEMAP_KEY` at the `RouteMap` boundary and passed into the
pure resolver so it stays unit-testable:

1. **`tileConfig(id, theme, apiKey?)`** — when `apiKey` is a non-empty string, the
   Standard (CARTO) URLs gain `?api_key=<key>` (a query string, not a Leaflet `{...}`
   placeholder, so tile substitution is untouched). Voyager / Dark Matter / retina `{r}`
   / attribution / subdomains are otherwise unchanged. CyclOSM ignores the key (always
   keyless).
2. **Missing-key safety net (observable degrade, not silent).** If no key is configured,
   the Standard slot must **not** emit a `cartocdn` URL (which would watermark). It falls
   back to the keyless CyclOSM tiles for that slot and logs a single clear
   `console.warn` naming the missing `VITE_CARTO_BASEMAP_KEY`. This guarantees no visitor
   ever sees a watermark even if the prod env var is forgotten, while surfacing the
   misconfiguration to logs (per the "surface errors, never a bare catch" rule — a
   logged, commented degrade, not a silent swallow).
3. **Wire the boundary.** `RouteMap` passes `import.meta.env.VITE_CARTO_BASEMAP_KEY` into
   `tileConfig`. Type it via an `ImportMetaEnv` interface in `src/vite-env.d.ts`.
4. **Config + docs, no secret.** Add `.env.example` with `VITE_CARTO_BASEMAP_KEY=` (empty,
   documented) and a short note on where the key goes (Cloudflare Pages env for prod,
   `.env.local` for dev, obtained free from carto.com/basemaps/apikey).

## Behaviours — Given / When / Then

- **B1 (AC1 — light unwatermarked).** *Given* a key is configured, *when* the Standard
  basemap resolves in **light** theme, *then* the URL is the CARTO Voyager tile with
  `?api_key=<key>` appended (an authenticated, unwatermarked request).
- **B2 (AC2 — dark unwatermarked).** *Given* a key is configured, *when* the Standard
  basemap resolves in **dark** theme, *then* the URL is the CARTO Dark Matter tile with
  `?api_key=<key>` appended.
- **B3 (no watermark without a key).** *Given* **no** key is configured, *when* the
  Standard basemap resolves in either theme, *then* the URL contains **no** `cartocdn`
  host and no `api_key` (it falls back to keyless tiles), so no watermark can appear, and
  a warning is logged.
- **B4 (CyclOSM untouched).** *Given* any key state, *when* CyclOSM resolves, *then* it is
  the keyless CyclOSM URL in both themes (unchanged).
- **B5 (AC3 — no secret committed).** *Given* the repo, *when* it is inspected, *then* no
  key is present in tracked files; only `.env.example` (empty) documents the variable, and
  `.env.local` stays gitignored.

## Increments (test-first)

1. **test:** B1/B2 — `tileConfig('standard', theme, 'KEY123')` light→voyager + dark→dark_all,
   each ending `?api_key=KEY123`, retina `{r}` + `{s}{z}{x}{y}` placeholders intact, CARTO
   attribution + `abcd` subdomains kept (red).
   **impl:** add `apiKey?` param to `tileConfig`; append `?api_key=` to the CARTO urls when
   present (green).
2. **test:** B3 — `tileConfig('standard', 'light'|'dark')` with no key → url has no
   `cartocdn` and no `api_key`; falls back to keyless (cyclosm) tiles; `console.warn` fired
   once (spy) (red).
   **impl:** keyless fallback for the Standard slot + commented `console.warn` (green).
3. **test:** B4 — CyclOSM url unchanged regardless of key arg (red, likely already green →
   assertion added as a guard).
   **impl:** none if green; else ensure key is ignored for CyclOSM.
4. **impl (boundary):** `RouteMap` passes `import.meta.env.VITE_CARTO_BASEMAP_KEY`; add
   `ImportMetaEnv` typing in `src/vite-env.d.ts`. Verify `tsc` + `vite build` green.
   *(No unit surface — Leaflet/jsdom map is eyeball-verified; existing App tests mock
   RouteMap. Verified honestly by build + manual look.)*
5. **config:** add `.env.example` (`VITE_CARTO_BASEMAP_KEY=`) + doc note (B5). Verify no
   key in tracked files (`git grep` clean) and `.env.local` is ignored.

## Out of scope / risks

- **Not** switching to vector tiles or a different map lib (invariant: Leaflet + raster).
- **Not** adding a runtime basemap picker beyond the existing Standard/CyclOSM.
- **Risk:** the free CARTO key must be created + set in Cloudflare Pages env by the user
  before deploy — the code is ready but prod stays watermarked until the env var is set.
  The B3 safety net means it degrades to CyclOSM (keyless, warned) rather than a watermark
  if that step is missed.
- **Risk / honest note:** a domain-restricted public basemap key is exposed in client tile
  requests by nature; "no secret in the repo" is satisfied (env-only), but it is not a
  private secret. Documented as such.
- **Verification limit:** actual tile pixels (watermark gone, correct light/dark) are
  verified by eye against a real key locally — stated honestly, not faked in a test.

## Notes
