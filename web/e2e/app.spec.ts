import { test, expect } from '@playwright/test';
import { stubExternal } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await stubExternal(page);
  await page.goto('/');
});

const routeList = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Routes' });

test('loads the map and lists the club routes', async ({ page }) => {
  // Leaflet actually initialises in a real browser (jsdom can't prove this).
  await expect(page.locator('.leaflet-container')).toBeVisible();

  await expect(routeList(page).getByRole('listitem')).toHaveCount(3);
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

  await expect(routeList(page).getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('London Orbital')).toHaveCount(0);
  await expect(
    page.getByText('2 routes within 25 km of Cambridge')
  ).toBeAttached();
});

test('searches a UK postcode via the postcode geocoder', async ({ page }) => {
  await page
    .getByRole('textbox', { name: /find routes near a place/i })
    .fill('CB2 1TN');
  await page.keyboard.press('Enter');

  await expect(routeList(page).getByRole('listitem')).toHaveCount(2);
});

test('opens the route’s existing link when a card is selected', async ({
  page,
}) => {
  await routeList(page).getByRole('listitem').first().click();

  const link = page.getByRole('link', { name: /open in strava/i });
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

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the core search journey still works', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible();

    await page
      .getByRole('textbox', { name: /find routes near a place/i })
      .fill('Cambridge');
    await page.keyboard.press('Enter');

    await expect(routeList(page).getByRole('listitem')).toHaveCount(2);
  });
});
