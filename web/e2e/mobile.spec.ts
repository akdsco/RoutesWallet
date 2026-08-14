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
const filtersPill = (page: Page) =>
  page.getByRole('button', { name: /^filters$/i });
const clearAll = (page: Page) =>
  sheet(page).getByRole('button', { name: /clear all/i });
const commit = (page: Page) =>
  sheet(page).getByRole('button', { name: /show \d+ routes?/i });

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
  // §H: detail is content-fit, not a fixed height — assert the detail shows and
  // its exit is reachable rather than a hardcoded snap px.
  await expect(detail(page)).toBeVisible();
  await expect(detail(page).getByRole('link')).toBeInViewport();
});

test('search then select surfaces the Open exit fully in view (no scroll)', async ({
  page,
}) => {
  await searchBox(page).fill('Cambridge');
  await page.keyboard.press('Enter');
  await expect(cards(page)).toHaveCount(2);

  await cards(page).filter({ hasText: 'Cambridge Loop' }).click();

  // §H: the exit is the source-named button ("Strava ↗"), not "Open in Strava".
  const open = detail(page).getByRole('link', { name: /strava/i });
  await expect(open).toBeVisible();
  // The one action the product exists to deliver must be reachable at the detail
  // snap without scrolling the sheet.
  await expect(open).toBeInViewport();
});

test('the selected sheet opens content-fit: a route with notes opens taller than a bare one, ≤ mid (§H)', async ({
  page,
}) => {
  const h = page.viewportSize()!.height;
  const mid = Math.round(h * 0.56);

  // Poll until the sheet's top stops moving (rides out the snap transition).
  const settledTop = async () => {
    let last = -1;
    await expect
      .poll(
        async () => {
          const y = Math.round((await sheet(page).boundingBox())!.y);
          const stable = y === last;
          last = y;
          return stable;
        },
        { timeout: 2000 }
      )
      .toBe(true);
    return last;
  };

  await handle(page).click(); // peek → mid, so all cards are reachable

  // Grantchester Spin is bare (no notes/elevation) → opens at the compact floor.
  await cards(page).filter({ hasText: 'Grantchester' }).click();
  await expect(detail(page)).toBeVisible();
  const bareTop = await settledTop();
  await page.getByRole('button', { name: /back to/i }).click();

  // Cambridge Loop carries café + notes + elevation → opens taller to show them…
  await cards(page).filter({ hasText: 'Cambridge Loop' }).click();
  await expect(detail(page).getByText(/fitzbillies/i)).toBeVisible();
  const notesTop = await settledTop();

  expect(notesTop).toBeLessThan(bareTop); // taller sheet = smaller top y
  expect(notesTop).toBeGreaterThanOrEqual(h - mid - 8); // …but never past mid
});

test('deselecting restores the pre-selection snap', async ({ page }) => {
  await searchBox(page).fill('Cambridge');
  await page.keyboard.press('Enter');
  await expect(cards(page)).toHaveCount(2); // auto-snapped to mid

  await handle(page).click(); // mid → full
  await settleAt(page, 132); // full: top = vh − (vh − 132) = 132, whatever vh is

  await cards(page).first().click(); // → detail
  await page.getByRole('button', { name: /back to/i }).click(); // §H: on-map pill

  // Restored to full (132), NOT collapsed to mid — the old choreography bug.
  await settleAt(page, 132);
});

test('the top chip row fits without an internal scrollbar at phone widths (TB-66)', async ({
  page,
}) => {
  // The POI chips are icon-only on mobile so the row (Filters + 4 POIs) fits
  // instead of overflowing its overflow-x-auto container into a scrollbar.
  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Cafés"]');
      const row = btn?.parentElement as HTMLElement | null;
      return row ? row.scrollWidth - row.clientWidth : -1;
    });
    expect(overflow, `chip row fits @${width}px`).toBeLessThanOrEqual(0);
  }
});

test('the filter view commits back to the map via an on-screen footer (TB-66)', async ({
  page,
}) => {
  const h = page.viewportSize()!.height;
  await settleAt(page, h - 132); // peek

  // Open Filters from the pill → the sheet swaps to the filter form.
  await filtersPill(page).click();
  await expect(clearAll(page)).toBeVisible();

  // The commit button that names the outcome must be reachable ON SCREEN at the
  // opening snap — the trap was it living at the foot of the 100dvh sheet, below
  // the fold at every snap. This is the layer that catches it (jsdom has no layout).
  await expect(commit(page)).toBeInViewport();

  // Committing leaves the form and returns to the route list at the pre-filter
  // snap (peek), i.e. no longer trapped.
  await commit(page).click();
  await expect(clearAll(page)).toHaveCount(0);
  await expect(cards(page).first()).toBeVisible();
  await settleAt(page, h - 132);
});

test('the commit footer stays on-screen after cycling the handle in the filter view (TB-66)', async ({
  page,
}) => {
  await filtersPill(page).click();
  await expect(commit(page)).toBeInViewport();

  // The filter view floors at mid: cycling the handle must never reach peek,
  // whose content budget hides the footer. Tap through the reachable snaps and
  // assert the commit button stays reachable at each.
  await handle(page).click(); // mid → full
  await expect(commit(page)).toBeInViewport();
  await handle(page).click(); // full → mid (NOT peek)
  await expect(commit(page)).toBeInViewport();
});

test('the Filters pill toggles the filter view shut while the sheet is raised (TB-66)', async ({
  page,
}) => {
  await filtersPill(page).click();
  await expect(clearAll(page)).toBeVisible();
  await expect(filtersPill(page)).toHaveAttribute('aria-expanded', 'true');

  // The reported trap was the pill sitting behind the raised sheet and only ever
  // re-opening. Tapping it here must be reachable AND close the form back to the
  // list — the second design exit.
  await filtersPill(page).click();
  await expect(clearAll(page)).toHaveCount(0);
  await expect(cards(page).first()).toBeVisible();
  await expect(filtersPill(page)).toHaveAttribute('aria-expanded', 'false');
});

test('the map-style button rides the content-fit sheet’s top edge (§H)', async ({
  page,
}) => {
  await handle(page).click(); // peek → mid, reach the cards
  await cards(page).filter({ hasText: 'Cambridge Loop' }).click(); // notes → taller sheet
  await expect(detail(page)).toBeVisible();

  const styleBtn = page.getByRole('button', { name: /map style/i });
  // The button must sit just above the sheet's actual (content-fit) top edge, not
  // detached at the fixed detail height — a ~12px gap, never overlapping.
  await expect
    .poll(
      async () => {
        const s = (await sheet(page).boundingBox())!;
        const b = (await styleBtn.boundingBox())!;
        const gap = s.y - (b.y + b.height);
        return gap >= 4 && gap <= 24;
      },
      { timeout: 2000 }
    )
    .toBe(true);
});

test('the back pill sits under the search row, not floating with a gap (§H)', async ({
  page,
}) => {
  await handle(page).click();
  await cards(page).first().click();
  const back = page.getByRole('button', { name: /back to/i });
  await expect(back).toBeVisible();

  const search = (await searchBox(page).boundingBox())!;
  const backBox = (await back.boundingBox())!;
  // Starts in the top-left control slot right under the search field, not ~56px
  // lower where the empty chip-row gap used to leave it.
  expect(backBox.y - (search.y + search.height)).toBeLessThan(28);
});

test('the selected route name clamps to two lines, then ellipsis (§H)', async ({
  page,
}) => {
  await handle(page).click();
  await cards(page).first().click();
  const clamp = await detail(page)
    .getByRole('heading')
    .evaluate((el) => getComputedStyle(el).webkitLineClamp);
  expect(clamp).toBe('2'); // two-line clamp, not single-line truncate
});

// NOTE — the raw finger-DRAG (pointerdown → move → release) is verified by eye on
// a real device; Playwright's synthetic pointer-capture drag doesn't faithfully
// reproduce it, and a flaky test would violate the retries:0 contract. What the
// drag *decides* is unit-tested (resolveSnap + settleVelocity), and the snap
// heights it lands on are asserted above via the tap path — so the mechanism is
// covered even though the gesture itself is eye-only.
