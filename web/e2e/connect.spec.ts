import { test, expect } from '@playwright/test';
import { stubExternal } from './helpers.ts';

const CONNECT = /connect strava/i;
const RECONNECT = /add more from strava/i;

// The pool after a member has connected (as the callback Function would have
// upserted it): the seeded routes plus one fresh Kent member contribution.
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

test('after a member connects, their route joins the pool everyone sees', async ({
  page,
}) => {
  // The pool now carries the member's contribution.
  await page.route('**/api/routes', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(POOL_WITH_MEMBER),
    })
  );

  // Return from Strava's callback.
  await page.goto('/?connect=ok&added=1');

  // Success status + the CTA relabels (browser "contributed" flag set).
  await expect(page.getByRole('status')).toContainText(/club pool/i);
  await expect(page.getByRole('link', { name: RECONNECT })).toBeVisible();

  // The member route is now visible in the shared pool.
  await expect(page.getByText('Ashdown Forest Loop')).toBeVisible();
  await expect(page.getByText('2 routes')).toBeVisible();
});
