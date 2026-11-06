import { expect, test, type Page } from '@playwright/test';

const tasks = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const taskName = (page: Page, name: string) =>
  tasks(page).getByRole('button', { name, exact: true });
const dialog = (page: Page) => page.getByRole('dialog');

async function addTask(page: Page, name: string, parent?: string) {
  await page
    .getByRole('button', { name: parent ? `Add Subtask to ${parent}` : 'Add Task', exact: true })
    .click();
  await dialog(page).getByRole('textbox', { name: 'Task Name' }).fill(name);
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

test('first launch shows an empty, untitled project', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'Project Title' })).toHaveValue(
    'Untitled Project',
  );
  await expect(page.getByRole('textbox', { name: 'Project Description' })).toHaveValue('');
  await expect(tasks(page).getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Add Task' })).toBeVisible();
});

test('builds a nested plan that survives a reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Project Title' }).fill('Website relaunch');
  await page.getByRole('textbox', { name: 'Project Description' }).fill('Q4 marketing site');
  await page.getByRole('textbox', { name: 'Project Description' }).press('Enter');

  await addTask(page, 'Website');
  await addTask(page, 'Design', 'Website');
  await addTask(page, 'Wireframes', 'Design');
  await addTask(page, 'Launch');

  const rows = tasks(page).getByRole('listitem');
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(2)).toHaveAttribute('aria-level', '3');

  await page.getByRole('button', { name: 'Collapse Design' }).click();
  await expect(taskName(page, 'Wireframes')).toBeHidden();

  await page.waitForTimeout(800); // autosave is debounced
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Project Title' })).toHaveValue(
    'Website relaunch',
  );
  await expect(page.getByRole('textbox', { name: 'Project Description' })).toHaveValue(
    'Q4 marketing site',
  );
  await expect(taskName(page, 'Design')).toBeVisible();
  await expect(taskName(page, 'Wireframes')).toBeHidden(); // still collapsed
});

test('deleting asks first, removes subtasks, and undo restores them', async ({ page }) => {
  await page.goto('./');
  await addTask(page, 'Website');
  await addTask(page, 'Design', 'Website');

  await page.getByRole('button', { name: 'Delete Website' }).click();
  await expect(dialog(page)).toContainText('All subtasks will be deleted.');
  await dialog(page).getByRole('button', { name: 'Delete' }).click();
  await expect(tasks(page).getByRole('listitem')).toHaveCount(1);

  await page.keyboard.press('ControlOrMeta+z');
  await expect(taskName(page, 'Website')).toBeVisible();
  await expect(taskName(page, 'Design')).toBeVisible();
});

test('weekends cannot be picked, and edits are saved', async ({ page }) => {
  await page.goto('./');
  await addTask(page, 'Build');
  await taskName(page, 'Build').click();
  await expect(dialog(page)).toHaveAccessibleName('Edit Task');

  await dialog(page)
    .getByRole('button', { name: /^Planned Start Date/ })
    .click();
  const disabledDays = dialog(page).locator('[data-day][data-disabled]');
  expect(await disabledDays.count()).toBeGreaterThanOrEqual(8); // every Sat & Sun shown
  for (const day of await disabledDays.all()) {
    const weekday = new Date(`${await day.getAttribute('data-day')}T12:00:00`).getDay();
    expect([0, 6]).toContain(weekday);
  }
  await dialog(page).locator('[data-day]:not([data-disabled]) button').first().click();
  await expect(dialog(page).getByRole('button', { name: /^Planned Start Date/ })).not.toContainText(
    'No Date',
  );

  await dialog(page).getByText('Urgent').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();

  await taskName(page, 'Build').click();
  await expect(dialog(page).getByRole('radio', { name: 'Urgent' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});

test('End Date stays disabled until its Start Date is set', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10, 0)); // Wed 4 Nov 2026
  await page.goto('./');
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task Name' }).fill('Design');
  const start = dialog(page).getByRole('button', { name: /^Planned Start Date/ });
  const end = dialog(page).getByRole('button', { name: /^Planned End Date/ });
  const day = (iso: string) => dialog(page).locator(`[data-day="${iso}"] button`);

  for (const box of ['Planned', 'Actual']) {
    const boxEnd = dialog(page).getByRole('button', { name: new RegExp(`^${box} End Date`) });
    await expect(boxEnd).toBeDisabled();
    await expect(boxEnd).toHaveAccessibleDescription('Pick a start date first');
    await expect(boxEnd).toHaveCSS('cursor', 'not-allowed');
  }

  await start.click();
  await day('2026-11-04').click();
  await expect(end).toBeEnabled();
  await end.click();
  await day('2026-11-06').click();
  await expect(end).toHaveText(/Fri 6 Nov 2026/);

  // Clearing the start clears and disables the end again.
  await dialog(page).getByRole('button', { name: 'Clear Planned Start Date' }).click();
  await expect(end).toHaveText(/No Date/);
  await expect(end).toBeDisabled();

  await start.click();
  await day('2026-11-05').click();
  await end.click();
  await day('2026-11-09').click();
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^Design: Thu 5 Nov 2026 – Mon 9 Nov 2026/ }),
  ).toBeVisible();
});

test('remarks are saved with the task and survive a reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task Name' }).fill('Design');
  const remarks = dialog(page).getByRole('textbox', { name: 'Remarks' });
  const priority = (await dialog(page).getByRole('group', { name: 'Priority' }).boundingBox())!;
  expect((await remarks.boundingBox())!.y).toBeGreaterThan(priority.y + priority.height - 1);
  await expect(remarks).toHaveCSS('resize', 'vertical');
  await remarks.fill('Waiting on the quote\nThen start');
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();

  await page.waitForTimeout(800); // autosave is debounced
  await page.reload();
  await taskName(page, 'Design').click();
  await expect(dialog(page).getByRole('textbox', { name: 'Remarks' })).toHaveValue(
    'Waiting on the quote\nThen start',
  );
});
