import { expect, test, type Page } from '@playwright/test';

// Cut off at the narrowest width, and fits long before half the window in any font.
const NAME = 'Prepare the regional launch plan details';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 19, 10, 0));
  await page.goto('./');
});

const divider = (page: Page) => page.getByRole('separator', { name: 'Resize Task Panel' });
const name = (page: Page) => page.getByRole('button', { name: NAME, exact: true });
/** How many more pixels the name needs to show in full (0 when it fits). */
const missingWidth = (page: Page) => name(page).evaluate((el) => el.scrollWidth - el.clientWidth);
const nameWidth = async (page: Page) => (await name(page).boundingBox())!.width;

async function dragDivider(page: Page, by: number) {
  const box = (await divider(page).boundingBox())!;
  const y = box.y + 200;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + by, y, { steps: 8 });
  await page.mouse.up();
}

test('dragging the divider widens the task panel, up to half the window', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Task Name' }).fill(NAME);
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '320');
  const missing = await missingWidth(page);
  expect(missing).toBeGreaterThan(0); // ends in "…"
  const scroller = page.getByTestId('workspace-scroller');
  const scrollLeft = await scroller.evaluate((el) => el.scrollLeft);
  const before = await nameWidth(page);

  // Fonts differ between machines (Linux's are wider), so widen by what this one needs.
  const by = missing + 16;
  expect(320 + by).toBeLessThan(640);
  await dragDivider(page, by);
  await expect(divider(page)).toHaveAttribute('aria-valuenow', String(320 + by));
  expect(Math.round((await nameWidth(page)) - before)).toBe(by); // the name gets all the room
  expect(await missingWidth(page)).toBe(0); // the whole name fits now
  // The timeline keeps the same dates in view.
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(scrollLeft);

  await dragDivider(page, 600);
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '640'); // half of 1280

  await page.waitForTimeout(800); // the task's autosave is debounced
  await page.reload(); // the width is remembered in this browser
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '640');

  await divider(page).dblclick();
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '320');
  expect(await missingWidth(page)).toBeGreaterThan(0);
});

test('phones keep their fixed task panel and have no divider', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Add Task', exact: true })).toBeVisible();
  await expect(page.getByRole('separator')).toHaveCount(0);
});
