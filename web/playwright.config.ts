import { defineConfig, devices } from '@playwright/test';

// E2E runs against the real production bundle: `vite build` then `vite preview`,
// so the browser exercises exactly what ships. External services (map tiles,
// geocoders) and the routes feed are stubbed per-test (see e2e/helpers.ts) to
// keep runs deterministic and offline.
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries. The suite is fully stubbed + offline (see e2e/helpers.ts), so it
  // is deterministic — a failure is a real bug, and retrying would mask exactly
  // the flakiness this platform exists to surface. If a test ever needs a retry
  // to pass, that is the finding, not something to paper over.
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    // Desktop suite (app.spec.ts). Ignores the mobile spec so its queries (which
    // assume the sidebar layout) never run under a phone viewport.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/mobile.spec.ts',
    },
    // Mobile suite (mobile.spec.ts) — a phone viewport under the 768px breakpoint,
    // with touch, so the bottom-sheet layout + gestures run in a real browser.
    // NOTE: this is Chromium; the horizontal-overflow bug that prompted these
    // tests was iOS/WebKit-specific. A WebKit ('iPhone 15') project would add true
    // engine parity — a worthwhile follow-up once webkit is in the CI image.
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
      testMatch: '**/mobile.spec.ts',
    },
    // WebKit (iPhone 15) — the engine parity that matters: the horizontal-overflow
    // bug these tests guard was iOS/WebKit-specific and did NOT reproduce in
    // Chromium. This runs the same mobile spec on Safari's engine.
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 15'] },
      testMatch: '**/mobile.spec.ts',
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    port: PORT,
    // Never reuse an existing server — always build + preview fresh, so the
    // browser can never run a stale `dist/` from a leftover preview. Local
    // behaviour then matches CI exactly. Build is ~1s; the safety is worth it.
    // (strictPort makes a port collision fail loudly rather than silently.)
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
