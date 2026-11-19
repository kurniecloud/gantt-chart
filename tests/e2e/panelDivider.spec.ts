import { expect, test, type Page } from '@playwright/test';

const LONG_NAME = 'Prepare the detailed launch communication plan for every regional team';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 19, 10, 0));
  await page.goto('./');
});

const divider = (page: Page) => page.getByRole('separator', { name: 'Resize Task Panel' });
const name = (page: Page) => page.getByRole('button', { name: LONG_NAME, exact: true });
const isCutOff = (page: Page) => name(page).evaluate((el) => el.scrollWidth > el.clientWidth);

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
  await page.getByRole('dialog').getByRole('textbox', { name: 'Task Name' }).fill(LONG_NAME);
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '320');
  expect(await isCutOff(page)).toBe(true); // ends in "…"
  const scroller = page.getByTestId('workspace-scroller');
  const scrollLeft = await scroller.evaluate((el) => el.scrollLeft);

  await dragDivider(page, 260);
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '580');
  expect(Math.round((await name(page).boundingBox())!.width)).toBeGreaterThan(400);
  expect(await isCutOff(page)).toBe(false); // the whole name fits now
  // The timeline keeps the same dates in view.
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(scrollLeft);

  await dragDivider(page, 400);
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '640'); // half of 1280

  await page.waitForTimeout(800); // the task's autosave is debounced
  await page.reload(); // the width is remembered in this browser
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '640');

  await divider(page).dblclick();
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '320');
  expect(await isCutOff(page)).toBe(true);
});

test('phones keep their fixed task panel and have no divider', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Add Task', exact: true })).toBeVisible();
  await expect(page.getByRole('separator')).toHaveCount(0);
});
