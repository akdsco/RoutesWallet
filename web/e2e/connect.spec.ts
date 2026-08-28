import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { stubExternal } from './helpers.ts';

const CONNECT = /connect strava/i;

// The shared pool after a member has connected (as the sync Function would have
// upserted it): a seeded club route plus one Kent member contribution owned by
// athlete 99.
const POOL_WITH_MEMBER = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'cam-loop',
        name: 'Cambridge Loop',
        link: 'https://www.strava.com/routes/1',
        distance_km: 42,
        source: 'club-verified',
        country: 'United Kingdom',
        region: 'Cambridgeshire',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0.1, 52.2],
          [0.14, 52.21],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'member-ashdown',
        name: 'Ashdown Forest Loop',
        link: 'https://www.strava.com/routes/9911',
        distance_km: 55,
        source: 'club-member',
        country: 'United Kingdom',
        region: 'Kent',
        owner_name: 'Jo Rider',
        owner_strava_id: '99',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0.1, 51.07],
          [0.13, 51.1],
        ],
      },
    },
  ],
};

/** Sign the member in: /api/me reports them, /api/routes carries their route. */
async function signIn(page: Page) {
  await page.route('**/api/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ signedIn: true, athleteId: 99, name: 'Jo Rider' }),
    })
  );
  await page.route('**/api/routes', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(POOL_WITH_MEMBER),
    })
  );
}

test.beforeEach(async ({ page }) => {
  await stubExternal(page);
});

test('offers a Connect Strava CTA linking to the OAuth consent screen', async ({
  page,
}) => {
  await page.goto('/');

  const link = page.getByRole('link', { name: CONNECT });
  await expect(link).toBeVisible();

  const url = new URL((await link.getAttribute('href'))!);
  expect(url.origin + url.pathname).toBe(
    'https://www.strava.com/oauth/authorize'
  );
  expect(url.searchParams.get('scope')).toBe('read,activity:read_all');
  expect(url.searchParams.get('redirect_uri')).toContain('/connect/callback');
});

test('signing in: progress → unmissable count, then the member is signed in', async ({
  page,
}) => {
  await signIn(page);
  // Hold the sync briefly so the progress state is observable, not a blink.
  await page.route('**/connect/sync', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ added: 1, skipped: 0 }),
    });
  });

  // Return from Strava's callback (the Function redirected here signed in).
  await page.goto('/?connect=start');

  // Visible progress while the pull runs — not a frozen blank.
  await expect(page.getByRole('status')).toContainText(/sync/i);

  // Then an unmissable result naming how many routes were added.
  await expect(page.getByRole('status')).toContainText(/added 1 route/i);
  await expect(page.getByText(/signed in as/i)).toContainText(/jo rider/i);

  // The member's route is now in the shared pool everyone sees.
  await expect(page.getByText('Ashdown Forest Loop')).toBeVisible();
});

test('a signed-in member views just their own routes, then all, then signs out', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/');

  // Both club + member routes to begin with.
  await expect(page.getByText('Ashdown Forest Loop')).toBeVisible();
  await expect(page.getByText('Cambridge Loop')).toBeVisible();

  // Switch to "My routes" → only the member's own (owner 99) remain.
  await page.getByRole('button', { name: /my routes/i }).click();
  await expect(page.getByText('Ashdown Forest Loop')).toBeVisible();
  await expect(page.getByText('Cambridge Loop')).toHaveCount(0);

  // Back to all club routes.
  await page.getByRole('button', { name: /all routes/i }).click();
  await expect(page.getByText('Cambridge Loop')).toBeVisible();

  // Sign out → the CTA returns and the club pool is still there.
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page.getByRole('link', { name: CONNECT })).toBeVisible();
  await expect(page.getByText('Cambridge Loop')).toBeVisible();
});
