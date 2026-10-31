import { expect, test, type Page } from '@playwright/test';

const tasks = (page: Page) => page.getByRole('list', { name: 'Tasks' });
const taskName = (page: Page, name: string) =>
  tasks(page).getByRole('button', { name, exact: true });
const dialog = (page: Page) => page.getByRole('dialog');

async function addTask(page: Page, name: string, parent?: string) {
  await page
    .getByRole('button', { name: parent ? `Add subtask to ${parent}` : 'Add task', exact: true })
    .click();
  await dialog(page).getByRole('textbox', { name: 'Task name' }).fill(name);
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

test('first launch shows an empty, untitled project', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'Project title' })).toHaveValue(
    'Untitled project',
  );
  await expect(page.getByRole('textbox', { name: 'Project description' })).toHaveValue('');
  await expect(tasks(page).getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Add task' })).toBeVisible();
});

test('builds a nested plan that survives a reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Project title' }).fill('Website relaunch');
  await page.getByRole('textbox', { name: 'Project description' }).fill('Q4 marketing site');
  await page.getByRole('textbox', { name: 'Project description' }).press('Enter');

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
  await expect(page.getByRole('textbox', { name: 'Project title' })).toHaveValue(
    'Website relaunch',
  );
  await expect(page.getByRole('textbox', { name: 'Project description' })).toHaveValue(
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
  await expect(dialog(page)).toHaveAccessibleName('Edit task');

  await dialog(page)
    .getByRole('button', { name: /^Start date/ })
    .click();
  const disabledDays = dialog(page).locator('[data-day][data-disabled]');
  expect(await disabledDays.count()).toBeGreaterThanOrEqual(8); // every Sat & Sun shown
  for (const day of await disabledDays.all()) {
    const weekday = new Date(`${await day.getAttribute('data-day')}T12:00:00`).getDay();
    expect([0, 6]).toContain(weekday);
  }
  await dialog(page).locator('[data-day]:not([data-disabled]) button').first().click();
  await expect(dialog(page).getByRole('button', { name: /^Start date/ })).not.toContainText(
    'No date',
  );

  await dialog(page).getByText('Urgent').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();

  await taskName(page, 'Build').click();
  await expect(dialog(page).getByRole('radio', { name: 'Urgent' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});
