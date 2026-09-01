import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { stubExternal } from './helpers.ts';

const CONNECT = /connect with strava/i;

// The shared pool after a member has connected: a seeded club route plus one Kent
// member contribution owned by athlete 99.
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

test('offers a Connect CTA that begins the server-side OAuth flow', async ({
  page,
}) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: CONNECT });
  await expect(link).toBeVisible();
  expect(await link.getAttribute('href')).toBe('/connect/start');
});

test('signing in: loading panel → itemised summary → See my routes', async ({
  page,
}) => {
  await signIn(page);
  await page.route('**/connect/sync', async (route) => {
    await new Promise((r) => setTimeout(r, 700));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ added: 1, updated: 0, skipped: 0 }),
    });
  });

  await page.goto('/?connect=start');

  // A designed loading state (not a bare line), then the itemised summary.
  await expect(
    page.getByRole('heading', { name: /bringing in your routes/i })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /your routes are in/i })
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText(/added/i);

  // The avatar marks the signed-in account.
  await expect(
    page.getByRole('button', { name: /account, jo rider/i })
  ).toBeVisible();

  // "See my routes" narrows to the member's own contribution.
  await page.getByRole('button', { name: /see my routes/i }).click();
  await expect(
    page.getByRole('button', { name: /ashdown forest loop/i })
  ).toBeVisible();
  await expect(page.getByText('Cambridge Loop')).toHaveCount(0);
});

test('my routes vs all, then sign out via the account menu', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/');

  await expect(page.getByText('Ashdown Forest Loop')).toBeVisible();
  await expect(page.getByText('Cambridge Loop')).toBeVisible();

  await page.getByRole('button', { name: /my routes/i }).click();
  await expect(page.getByText('Cambridge Loop')).toHaveCount(0);
  await page.getByRole('button', { name: /all routes/i }).click();
  await expect(page.getByText('Cambridge Loop')).toBeVisible();

  // Sign out lives in the avatar menu now.
  await page.getByRole('button', { name: /account, jo rider/i }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await expect(page.getByRole('link', { name: CONNECT })).toBeVisible();
  await expect(page.getByText('Cambridge Loop')).toBeVisible();
});

test('opens Settings from the account menu and can disconnect', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/');

  await page.getByRole('button', { name: /account, jo rider/i }).click();
  await page.getByRole('menuitem', { name: /settings/i }).click();

  // Settings replaces the list.
  await expect(page.getByRole('link', { name: /sync now/i })).toBeVisible();
  await expect(page.getByRole('group', { name: /units/i })).toBeVisible();

  // Disconnect confirms inline, then returns to the signed-out CTA.
  await page.getByRole('button', { name: /^disconnect$/i }).click();
  await expect(page.getByText(/stay in the library/i)).toBeVisible();
  await page.getByRole('button', { name: /^disconnect$/i }).click();
  await expect(page.getByRole('link', { name: CONNECT })).toBeVisible();
});
