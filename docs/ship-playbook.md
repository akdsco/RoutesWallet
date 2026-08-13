# Ship playbook — RoutesWallet

Recurring `failure signature → fix` entries for `/ship`'s CI watch. Append a new
entry after resolving a novel failure so the next run is faster.

## Signatures

### e2e — mobile-webkit search assertion times out (`toHaveCount(2)` got 3)

- **Where:** `web/e2e/mobile.spec.ts` search-then-* tests (e.g. `:70`, `:86`) —
  a `await expect(cards(page)).toHaveCount(2)` after typing a place + Enter.
- **Signature:** fails on **mobile-webkit only**, `Expected: 2 / Received: 3`,
  5s timeout "waiting for … locator('[data-route-id]')". chromium is green.
- **Cause:** flake, not a regression. Playwright runs with `retries: 0`
  (deterministic-by-design), and webkit is slow to settle the keyboard-Enter →
  stubbed-geocode → matches re-render under the 3-worker parallel load in CI.
  Reproduces ~1-in-5 locally under load; passes 4/4 in isolation, and chromium
  always passes.
- **Fix:** re-run the failed job — `gh run rerun <run-id> --failed`. Only treat
  as real if it also fails on chromium or reproduces in isolation
  (`npx playwright test mobile.spec.ts:<line> --project=mobile-webkit --repeat-each=5`).
