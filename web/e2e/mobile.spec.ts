import { test, expect, type Page } from '@playwright/test';
import { stubExternal } from './helpers.ts';

// The mobile bottom-sheet layout (§F) in a real browser — the layer that catches
// what jsdom can't: page overflow, snap geometry, and real pointer drag.

test.beforeEach(async ({ page }) => {
  await stubExternal(page);
  await page.goto('/');
});

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Routes' });
const handle = (page: Page) =>
  sheet(page).getByRole('button', { name: /route list/i });
const cards = (page: Page) => sheet(page).locator('[data-route-id]');
const searchBox = (page: Page) => page.getByRole('textbox');
const detail = (page: Page) =>
  page.getByRole('region', { name: /route detail/i });

async function sheetTop(page: Page): Promise<number> {
  const box = await sheet(page).boundingBox();
  return box!.y;
}
/** Poll until the sheet has settled with its top ~`target` px — rides out the
 *  snap transition without a fixed sleep, so it's deterministic across engines
 *  and CI-runner speeds (a fixed wait flaked on the slower WebKit CI runner). */
const settleAt = (page: Page, target: number, tol = 8) =>
  expect
    .poll(async () => Math.abs((await sheetTop(page)) - target), {
      timeout: 2000,
    })
    .toBeLessThanOrEqual(tol);

test('the page never scrolls sideways at phone widths', async ({ page }) => {
  await expect(cards(page).first()).toBeVisible();

  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const m = await page.evaluate(() => {
      const el = document.scrollingElement as HTMLElement;
      el.scrollLeft = 9999; // try to scroll right...
      const scrolled = el.scrollLeft; // ...and see if it moved
      el.scrollLeft = 0;
      return { scrollW: el.scrollWidth, clientW: el.clientWidth, scrolled };
    });
    // The real symptom is a horizontally *scrollable* page; clip must forbid it.
    expect(m.scrolled, `page not h-scrollable @${width}px`).toBe(0);
    expect(
      m.scrollW,
      `content within viewport @${width}px`
    ).toBeLessThanOrEqual(m.clientW);
  }
});

test('the sheet rests at peek, rises to mid via the handle, detail on select', async ({
  page,
}) => {
  await expect(cards(page).first()).toBeVisible();
  const h = page.viewportSize()!.height;

  await settleAt(page, h - 132); // peek

  await handle(page).click();
  await settleAt(page, h - Math.round(h * 0.56)); // mid

  await cards(page).first().click();
  await settleAt(page, h - 260); // detail (DETAIL_PX)
});

test('search then select surfaces the Open exit fully in view (no scroll)', async ({
  page,
}) => {
  await searchBox(page).fill('Cambridge');
  await page.keyboard.press('Enter');
  await expect(cards(page)).toHaveCount(2);

  await cards(page).filter({ hasText: 'Cambridge Loop' }).click();

  const open = detail(page).getByRole('link', { name: /open in strava/i });
  await expect(open).toBeVisible();
  // The one action the product exists to deliver must be reachable at the detail
  // snap without scrolling the sheet.
  await expect(open).toBeInViewport();
});

test('deselecting restores the pre-selection snap', async ({ page }) => {
  await searchBox(page).fill('Cambridge');
  await page.keyboard.press('Enter');
  await expect(cards(page)).toHaveCount(2); // auto-snapped to mid

  await handle(page).click(); // mid → full
  await settleAt(page, 132); // full: top = vh − (vh − 132) = 132, whatever vh is

  await cards(page).first().click(); // → detail
  await detail(page)
    .getByRole('button', { name: /back to/i })
    .click();

  // Restored to full (132), NOT collapsed to mid — the old choreography bug.
  await settleAt(page, 132);
});

// NOTE — the raw finger-DRAG (pointerdown → move → release) is verified by eye on
// a real device; Playwright's synthetic pointer-capture drag doesn't faithfully
// reproduce it, and a flaky test would violate the retries:0 contract. What the
// drag *decides* is unit-tested (resolveSnap + settleVelocity), and the snap
// heights it lands on are asserted above via the tap path — so the mechanism is
// covered even though the gesture itself is eye-only.
