import { test, expect, type Page } from '@playwright/test';
import { stubExternal } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await stubExternal(page);
  await page.goto('/');
});

const routeList = (page: Page) => page.getByRole('group', { name: 'Routes' });
const routeCards = (page: Page) => routeList(page).locator('[data-route-id]');
// The county chip is the button carrying aria-pressed with that name (the group
// header uses aria-expanded; cards carry neither).
const countyChip = (page: Page, name: string) =>
  page.locator('button[aria-pressed]').filter({ hasText: name });

test('filter → search → sort → URL round-trips the whole view', async ({
  page,
}) => {
  // Filter to one county — the pool, count line and URL all update.
  await page.getByRole('button', { name: /^filters$/i }).click();
  await countyChip(page, 'Cambridgeshire').click();

  await expect(routeCards(page)).toHaveCount(2);
  await expect(page.getByText('2 of 3 routes')).toBeVisible();
  await expect(page.getByText('London Orbital')).toHaveCount(0);
  await expect(page).toHaveURL(/county=cambridgeshire/);

  // Sort within the pool: long → short puts the 42 km route above the 28 km one.
  await page.getByRole('button', { name: /^sort:/i }).click();
  await page.getByRole('menuitemradio', { name: /distance, long/i }).click();
  await expect(page).toHaveURL(/sort=distance-desc/);
  await expect(routeCards(page).first()).toContainText('Cambridge Loop');

  // A search ranks WITHIN the filtered pool: "K of M filtered".
  await page
    .getByRole('textbox', { name: /find routes near a place/i })
    .fill('Cambridge');
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Within 25 km of Cambridge · 2 of 2 filtered')
  ).toBeVisible();

  // Clearing the search returns to the filtered pool (not everything).
  await page.getByRole('button', { name: /clear search/i }).click();
  await expect(page.getByText('2 of 3 routes')).toBeVisible();

  // Reopening the shared URL restores the filter + the chosen sort (fresh reload).
  await page.reload();
  await expect(routeCards(page)).toHaveCount(2);
  await expect(page.getByText('2 of 3 routes')).toBeVisible();
  await expect(page.getByRole('button', { name: /^sort:/i })).toContainText(
    'Distance ↓'
  );
});

test('a shared URL degrades: unknown county + out-of-domain range are dropped', async ({
  page,
}) => {
  await page.goto('/?county=cambridgeshire,atlantis&dist=0-9999&sort=bogus');

  // cambridgeshire applies (2 routes); atlantis + the impossible range are
  // dropped without error, and the bogus sort falls back to the default.
  await expect(routeCards(page)).toHaveCount(2);
  await expect(page.getByText('2 of 3 routes')).toBeVisible();
});

test('folding a county group hides its cards; the header stays', async ({
  page,
}) => {
  const header = page.locator('button[aria-expanded]', {
    hasText: 'Cambridgeshire',
  });
  await expect(header).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Cambridge Loop')).toBeVisible();

  await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Cambridge Loop')).toHaveCount(0);
});
