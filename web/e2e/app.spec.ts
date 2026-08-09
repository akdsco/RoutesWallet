import { test, expect } from '@playwright/test';
import { stubExternal } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await stubExternal(page);
  await page.goto('/');
});

const routeList = (page: import('@playwright/test').Page) =>
  page.getByRole('group', { name: 'Routes' });
// Cards are role=button now (a11y); count them by their stable data-route-id so
// a notice's "Show all routes" button never inflates the count.
const routeCards = (page: import('@playwright/test').Page) =>
  routeList(page).locator('[data-route-id]');

test('loads the map and lists the club routes', async ({ page }) => {
  // Leaflet actually initialises in a real browser (jsdom can't prove this).
  await expect(page.locator('.leaflet-container')).toBeVisible();

  await expect(routeCards(page)).toHaveCount(3);
  await expect(page.getByText('Cambridge Loop')).toBeVisible();
  await expect(page.getByText('3 routes')).toBeVisible();
});

test('searches near a place and filters to routes in range', async ({
  page,
}) => {
  await page
    .getByRole('textbox', { name: /find routes near a place/i })
    .fill('Cambridge');
  await page.keyboard.press('Enter');

  await expect(routeCards(page)).toHaveCount(2);
  await expect(page.getByText('London Orbital')).toHaveCount(0);
  await expect(
    page.getByText('2 routes within 25 km of Cambridge')
  ).toBeAttached();

  // Nearest-first: the feed lists Grantchester before Cambridge Loop, so the
  // nearer Cambridge Loop leading the list proves the distance sort ran.
  await expect(routeCards(page).first()).toContainText('Cambridge Loop');
});

// Load-bearing for the postcode path specifically: real geocode runs here, the
// postcodes.io stub returns Cambridge and the Nominatim FALLBACK returns Girona
// (out of range). So a match only happens via the postcode branch — if it broke
// and fell through to Nominatim, the count would be 0 and this would fail.
test('searches a UK postcode via the postcode geocoder', async ({ page }) => {
  await page
    .getByRole('textbox', { name: /find routes near a place/i })
    .fill('CB2 1TN');
  await page.keyboard.press('Enter');

  await expect(routeCards(page)).toHaveCount(2);
});

test('opens the route’s existing link when a card is selected', async ({
  page,
}) => {
  // Click the Cambridge Loop card by name, not by index — order-independent.
  await routeCards(page).filter({ hasText: 'Cambridge Loop' }).click();

  // Selecting opens the detail panel (§E), which owns the Open link.
  const link = page
    .getByRole('region', { name: /route detail/i })
    .getByRole('link', { name: /open in strava/i });
  await expect(link).toHaveAttribute('href', 'https://www.strava.com/routes/1');
  await expect(link).toHaveAttribute('target', '_blank');
});

test('flips the theme toggle', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /switch to dark theme/i });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();

  await expect(
    page.getByRole('button', { name: /switch to light theme/i })
  ).toHaveAttribute('aria-pressed', 'true');
});

// A render-smoke under prefers-reduced-motion: it proves the app boots and the
// search journey works with the flag set, and guards against a crash in code
// that reads the media query. It does NOT assert the actual reduced-motion
// behaviour — the only consumer is the wheel-zoom EASE snap inside the Leaflet
// canvas (RouteMap.tsx), which isn't driven here and can't be asserted on
// pixels. Verified by eye; noted honestly rather than faked.
test('under prefers-reduced-motion, boots and searches without error', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload(); // re-read the media query on a fresh mount

  await expect(page.locator('.leaflet-container')).toBeVisible();

  await page
    .getByRole('textbox', { name: /find routes near a place/i })
    .fill('Cambridge');
  await page.keyboard.press('Enter');

  await expect(routeCards(page)).toHaveCount(2);
});
