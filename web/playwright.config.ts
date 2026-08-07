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
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    port: PORT,
    // Local only: a preview already bound to PORT is reused, skipping the
    // build+preview above — so a STALE `dist/` from a leftover `npm run preview`
    // (or a prior run) can be tested. If a local run looks wrong, kill anything
    // on PORT and re-run. CI always sets CI, so it never reuses: it builds fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
