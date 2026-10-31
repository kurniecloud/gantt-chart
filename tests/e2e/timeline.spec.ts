import { expect, test, type Page } from '@playwright/test';

// Every test runs as if it were Wednesday 4 November 2026, 10:00 local time.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10, 0));
});

const dialog = (page: Page) => page.getByRole('dialog');
const timeline = (page: Page) => page.getByRole('group', { name: 'Timeline' });
const scroller = (page: Page) => page.getByTestId('workspace-scroller');
const todayHeader = (page: Page) => page.locator('[data-today]');
const taskPanelRight = async (page: Page) =>
  (await page.getByRole('list', { name: 'Tasks' }).boundingBox())!.x +
  (await page.getByRole('list', { name: 'Tasks' }).boundingBox())!.width;

/** Adds a task with dates picked from the calendar (both in November 2026). */
async function addDatedTask(page: Page, name: string, startDay: number, endDay: number) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task name' }).fill(name);
  await dialog(page)
    .getByRole('button', { name: /^Planned Start date/ })
    .click();
  await dialog(page)
    .locator(`[data-day="2026-11-${String(startDay).padStart(2, '0')}"] button`)
    .click();
  await dialog(page)
    .getByRole('button', { name: /^Planned End date/ })
    .click();
  await dialog(page)
    .locator(`[data-day="2026-11-${String(endDay).padStart(2, '0')}"] button`)
    .click();
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

test('opens on today in daily view, weekdays only', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('radio', { name: 'Daily' })).toBeChecked();
  await expect(todayHeader(page)).toHaveText('Wed 4');
  // Today's column sits right beside the task list.
  const today = (await todayHeader(page).boundingBox())!;
  expect(Math.abs(today.x - (await taskPanelRight(page)))).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-week-start]').first()).toContainText('Mon');
  await expect(page.getByText(/^(Sat|Sun) \d+$/)).toHaveCount(0);
});

test('a dated task gets a bar that lines up with its dates', async ({ page }) => {
  await page.goto('./');
  await addDatedTask(page, 'Design', 4, 6); // Wed–Fri

  const bar = timeline(page).getByRole('button', {
    name: /^Design: Wed 4 Nov 2026 – Fri 6 Nov 2026/,
  });
  await expect(bar).toBeVisible();
  const barBox = (await bar.boundingBox())!;
  const todayBox = (await todayHeader(page).boundingBox())!;
  expect(Math.abs(barBox.x - todayBox.x)).toBeLessThanOrEqual(1); // starts in Wed's column
  expect(Math.round(barBox.width)).toBe(3 * 48);

  await bar.click();
  await expect(dialog(page)).toHaveAccessibleName('Edit task');
});

test('weekly view, Today, and scrolling into the past', async ({ page }) => {
  await page.goto('./');
  await addDatedTask(page, 'Design', 4, 6);

  await page.getByText('Weekly', { exact: true }).click();
  await expect(todayHeader(page)).toHaveText('2 Nov - 6 Nov');
  const bar = timeline(page).getByRole('button', { name: /^Design:/ });
  expect(Math.round((await bar.boundingBox())!.width)).toBe(Math.round((3 * 144) / 5));

  // Scroll a year back: the header follows and today's week leaves the screen.
  await scroller(page).evaluate((el) => el.scrollBy({ left: -52 * 144 }));
  await expect(page.getByText('November 2025')).toBeVisible();
  await expect(todayHeader(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Today' }).click();
  await expect(todayHeader(page)).toBeVisible();
  await expect
    .poll(async () =>
      Math.abs((await todayHeader(page).boundingBox())!.x - (await taskPanelRight(page))),
    )
    .toBeLessThanOrEqual(2);

  // The choice is remembered after a reload.
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Weekly' })).toBeChecked();
});

test('task list and timeline scroll together vertically', async ({ page }) => {
  await page.goto('./');
  for (let i = 1; i <= 30; i++) {
    await page.getByRole('button', { name: 'Add task', exact: true }).click();
    await dialog(page).getByRole('textbox', { name: 'Task name' }).fill(`Task ${i}`);
    await dialog(page).getByRole('textbox', { name: 'Task name' }).press('Enter');
  }
  await page.getByRole('button', { name: 'Task 30', exact: true }).scrollIntoViewIfNeeded();
  const row = (await page.getByRole('button', { name: 'Task 30', exact: true }).boundingBox())!;
  const header = (await page.getByText('Task name', { exact: true }).boundingBox())!;
  expect(row.y).toBeGreaterThan(header.y + header.height - 1); // not hidden under the header
  await expect(page.getByText('Task name', { exact: true })).toBeInViewport(); // header stays pinned
});

test('adding and editing tasks does not move the timeline sideways', async ({ page }) => {
  await page.goto('./');
  const before = await scroller(page).evaluate((el) => el.scrollLeft);
  for (const name of ['One', 'Two', 'Three']) {
    await page.getByRole('button', { name: 'Add task', exact: true }).click();
    await dialog(page).getByRole('textbox', { name: 'Task name' }).fill(name);
    await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog(page)).toBeHidden();
  }
  await page.getByRole('button', { name: 'Two', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown'); // keyboard navigation in the pinned panel
  expect(await scroller(page).evaluate((el) => el.scrollLeft)).toBe(before);
  await expect(todayHeader(page)).toBeInViewport();
});
