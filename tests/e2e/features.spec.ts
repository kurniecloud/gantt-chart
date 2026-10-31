import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// Wednesday 4 November 2026, 10:00 local time.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10, 0));
  await page.goto('./');
});

const dialog = (page: Page) => page.getByRole('dialog');
const timeline = (page: Page) => page.getByRole('group', { name: 'Timeline' });
const day = (page: Page, iso: string) => dialog(page).locator(`[data-day="${iso}"] button`);

async function addTask(page: Page, name: string, dates?: [string, string], dependsOn?: string) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task name' }).fill(name);
  if (dates) {
    await dialog(page)
      .getByRole('button', { name: /^Start date/ })
      .click();
    await day(page, dates[0]).click();
    await dialog(page)
      .getByRole('button', { name: /^End date/ })
      .click();
    await day(page, dates[1]).click();
  }
  if (dependsOn) {
    await dialog(page)
      .getByRole('combobox', { name: 'Depends on' })
      .selectOption({ label: dependsOn });
  }
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

test('export downloads the project and import brings it back', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Project title' }).fill('Website relaunch');
  await page.getByRole('textbox', { name: 'Project title' }).press('Enter');
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('website-relaunch.gantt.json');
  const path = await download.path();
  const file = JSON.parse(await readFile(path, 'utf8'));
  expect(file.project.name).toBe('Website relaunch');

  // Change everything, then import the saved file over it.
  await page.getByRole('textbox', { name: 'Project title' }).fill('Something else');
  await page.getByRole('textbox', { name: 'Project title' }).press('Enter');
  await page.getByRole('button', { name: 'Delete Design' }).click();
  await dialog(page).getByRole('button', { name: 'Delete' }).click();

  await page.getByLabel('Project file to import').setInputFiles(path);
  await expect(dialog(page)).toHaveAccessibleName(/^Import “.*”\?$/);
  await dialog(page).getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('textbox', { name: 'Project title' })).toHaveValue(
    'Website relaunch',
  );
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeVisible();
  await expect(page.getByText('(3D)')).toBeVisible();
});

test('milestones are managed in a dialog and shown in green', async ({ page }) => {
  await page.getByRole('button', { name: 'Milestones' }).click();
  await dialog(page).getByRole('button', { name: 'Add milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone name, row 1' }).fill('Sign-off');
  await dialog(page)
    .getByRole('button', { name: /^Date for Sign-off/ })
    .click();
  await day(page, '2026-11-06').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();

  const marker = page.getByRole('img', { name: 'Milestone: Sign-off — Fri 6 Nov 2026' });
  await expect(marker).toBeVisible();
  const green = page.getByTestId('milestone-day');
  await expect(green).toHaveCSS('background-color', 'rgb(220, 245, 225)');
  // The green day sits under Friday's header cell.
  const friday = (await page.getByText('Fri 6', { exact: true }).boundingBox())!;
  const box = (await green.boundingBox())!;
  expect(Math.abs(box.x - friday.x)).toBeLessThanOrEqual(1);
});

test('today is light yellow, a single day even in weekly view', async ({ page }) => {
  const today = page.getByTestId('today-highlight');
  await expect(today).toHaveCSS('background-color', 'rgb(255, 246, 196)');
  expect(Math.round((await today.boundingBox())!.width)).toBe(48);
  await page.getByText('Weekly', { exact: true }).click();
  expect(Math.round((await today.boundingBox())!.width)).toBe(Math.round(144 / 5));
});

test('critical path follows dependencies and draws a red line', async ({ page }) => {
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']);
  await addTask(page, 'Build', ['2026-11-09', '2026-11-10'], 'Design');
  await addTask(page, 'Docs', ['2026-11-04', '2026-11-05']);

  await page.getByRole('button', { name: 'Critical path' }).click();
  await expect(page.getByText('2 critical tasks')).toBeVisible();

  const design = timeline(page).getByRole('button', { name: /^Design:.*Critical$/ });
  await expect(design).toBeVisible();
  await expect(timeline(page).getByRole('button', { name: /^Build:.*Critical$/ })).toBeVisible();
  await expect(timeline(page).getByRole('button', { name: /^Docs:/ })).not.toHaveAttribute(
    'data-critical',
  );

  // The line: bright red, 20% of the bar's height, centred.
  const line = await design.evaluate((el) => {
    const after = getComputedStyle(el, '::after');
    return {
      color: after.backgroundColor,
      height: after.height,
      top: after.top,
      bar: el.clientHeight,
    };
  });
  expect(line.color).toBe('rgb(255, 31, 31)');
  expect(parseFloat(line.height)).toBeCloseTo(line.bar * 0.2, 0);
  expect(parseFloat(line.top)).toBeCloseTo(line.bar * 0.4, 0);
});
