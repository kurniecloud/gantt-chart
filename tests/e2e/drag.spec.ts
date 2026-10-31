import { expect, test, type Locator, type Page } from '@playwright/test';

// Wednesday 4 November 2026, 10:00 local time.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10, 0));
  await page.goto('./');
});

const dialog = (page: Page) => page.getByRole('dialog');
const timeline = (page: Page) => page.getByRole('group', { name: 'Timeline' });
const names = (page: Page) => page.locator('[data-task-name]').allTextContents();

async function addTask(page: Page, name: string, dates?: [string, string]) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task name' }).fill(name);
  if (dates) {
    await dialog(page)
      .getByRole('button', { name: /^Planned Start date/ })
      .click();
    await dialog(page).locator(`[data-day="${dates[0]}"] button`).click();
    await dialog(page)
      .getByRole('button', { name: /^Planned End date/ })
      .click();
    await dialog(page).locator(`[data-day="${dates[1]}"] button`).click();
  }
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

/** Presses on `from`'s centre (plus an offset) and drags with the real mouse to `to`. */
async function drag(page: Page, from: Locator, to: { x: number; y: number }, dx = 0) {
  const box = (await from.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

test('drag a task by its grip to reorder and nest it', async ({ page }) => {
  await addTask(page, 'Design');
  await addTask(page, 'Build');
  await addTask(page, 'Launch');

  const design = (await page.getByRole('button', { name: 'Design', exact: true }).boundingBox())!;
  // Launch → top edge of Design: above it.
  await drag(page, page.getByRole('button', { name: 'Move Launch' }), {
    x: design.x + 40,
    y: design.y - 2,
  });
  expect(await names(page)).toEqual(['Launch', 'Design', 'Build']);

  // Build → middle of Design: becomes its subtask.
  const target = (await page.getByRole('button', { name: 'Design', exact: true }).boundingBox())!;
  await drag(page, page.getByRole('button', { name: 'Move Build' }), {
    x: target.x + 40,
    y: target.y + target.height / 2,
  });
  expect(await names(page)).toEqual(['Launch', 'Design', 'Build']);
  await expect(page.getByRole('button', { name: 'Collapse Design' })).toBeVisible();

  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByRole('button', { name: 'Collapse Design' })).toHaveCount(0);
});

test('drag a bar to move it and its edge to resize it', async ({ page }) => {
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']); // Wed–Fri
  const bar = timeline(page).getByRole('button', { name: /^Design:/ });
  const box = (await bar.boundingBox())!;

  // Move two days later.
  await drag(page, bar, { x: box.x + box.width / 2 + 96, y: box.y + box.height / 2 });
  await expect(bar).toHaveAccessibleName(/^Design: Fri 6 Nov 2026 – Tue 10 Nov 2026/);
  await expect(dialog(page)).toBeHidden();

  // Pull the end one day further.
  const moved = (await bar.boundingBox())!;
  await drag(
    page,
    bar,
    { x: moved.x + moved.width + 48 - 2, y: moved.y + 10 },
    moved.width / 2 - 2,
  );
  await expect(bar).toHaveAccessibleName(/^Design: Fri 6 Nov 2026 – Wed 11 Nov 2026/);
});

test('actual dates draw a blue line under the planned bar', async ({ page }) => {
  await addTask(page, 'Build', ['2026-11-02', '2026-11-06']);
  await timeline(page)
    .getByRole('button', { name: /^Build:/ })
    .click();
  await dialog(page)
    .getByRole('button', { name: /^Actual Start date/ })
    .click();
  await dialog(page).locator('[data-day="2026-11-03"] button').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();

  const line = page.getByTestId('actual-line');
  await expect(line).toHaveAccessibleName(
    'Build: Actual: Tue 3 Nov 2026 – Wed 4 Nov 2026 (in progress)',
  );
  await expect(line).toHaveCSS('background-color', 'rgb(10, 132, 255)');
  const lineBox = (await line.boundingBox())!;
  const barBox = (await timeline(page)
    .getByRole('button', { name: /^Build:/ })
    .boundingBox())!;
  expect(lineBox.y).toBeGreaterThanOrEqual(barBox.y + barBox.height);
  expect(Math.round(lineBox.height)).toBe(Math.round(barBox.height * 0.2));
  expect(Math.round(lineBox.width)).toBe(2 * 48);
});

test('the critical path recalculates after a drag', async ({ page }) => {
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']);
  await addTask(page, 'Docs', ['2026-11-04', '2026-11-05']);
  await page.getByRole('button', { name: 'Critical path' }).click();
  await expect(page.getByText('1 critical task')).toBeVisible();
  await expect(timeline(page).getByRole('button', { name: /^Docs:/ })).not.toHaveAttribute(
    'data-critical',
  );

  // Drag Docs one day later: it now ends on the last day too.
  const docs = timeline(page).getByRole('button', { name: /^Docs:/ });
  const box = (await docs.boundingBox())!;
  await drag(page, docs, { x: box.x + box.width / 2 + 48, y: box.y + box.height / 2 });
  await expect(page.getByText('2 critical tasks')).toBeVisible();
  await expect(docs).toHaveAttribute('data-critical', 'true');
  await expect(page.getByTestId('busy-overlay')).toHaveCount(0);
});
