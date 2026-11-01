import { expect, test, type Page } from '@playwright/test';

// Wednesday 4 November 2026, 10:00 local time.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10, 0));
  await page.goto('./');
});

const dialog = (page: Page) => page.getByRole('dialog');
const timeline = (page: Page) => page.getByRole('group', { name: 'Timeline' });
const day = (page: Page, iso: string) => dialog(page).locator(`[data-day="${iso}"] button`);
const totals = (page: Page) => page.getByTestId('project-totals');

async function addTask(page: Page, name: string, dates: [string, string]) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task name' }).fill(name);
  await dialog(page)
    .getByRole('button', { name: /^Planned Start date/ })
    .click();
  await day(page, dates[0]).click();
  await dialog(page)
    .getByRole('button', { name: /^Planned End date/ })
    .click();
  await day(page, dates[1]).click();
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

test('totals above "Task name" count tasks and measure planned and actual weekdays', async ({
  page,
}) => {
  await expect(totals(page)).toHaveText('0 tasks · Planned — · Actual —', { useInnerText: true });

  await addTask(page, 'Design', ['2026-11-02', '2026-11-06']);
  await addTask(page, 'Build', ['2026-11-09', '2026-11-13']);
  await expect(totals(page)).toHaveText('2 tasks · Planned 10D · Actual —', {
    useInnerText: true,
  });

  // Design started on Tuesday and is still going: today is Wednesday → 2 weekdays.
  await timeline(page)
    .getByRole('button', { name: /^Design:/ })
    .click();
  await dialog(page)
    .getByRole('button', { name: /^Actual Start date/ })
    .click();
  await day(page, '2026-11-03').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(totals(page)).toHaveText('2 tasks · Planned 10D · Actual 2D', {
    useInnerText: true,
  });
  await expect(totals(page).getByText('2D', { exact: true })).toHaveCSS('color', 'rgb(0, 98, 204)');

  // The task panel's header: totals level with the month row, "Task name" with the day row.
  const months = (await page.getByText('November 2026').boundingBox())!;
  const totalsBox = (await totals(page).boundingBox())!;
  const heading = (await page.getByText('Task name', { exact: true }).boundingBox())!;
  const dayCell = (await page.getByText('Wed 4', { exact: true }).boundingBox())!;
  expect(
    Math.abs(totalsBox.y + totalsBox.height / 2 - (months.y + months.height / 2)),
  ).toBeLessThan(3);
  expect(Math.abs(heading.y + heading.height / 2 - (dayCell.y + dayCell.height / 2))).toBeLessThan(
    3,
  );
});

test('the milestone summary sits beside the Milestones button', async ({ page }) => {
  const summary = page.getByTestId('milestone-summary');
  await expect(summary).toHaveText('No milestones');

  await page.getByRole('button', { name: 'Milestones' }).click();
  await dialog(page).getByRole('button', { name: 'Add milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone name, row 1' }).fill('Kick-off');
  await dialog(page)
    .getByRole('button', { name: /^Date for Kick-off/ })
    .click();
  await day(page, '2026-11-02').click();
  await dialog(page).getByRole('button', { name: 'Add milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone name, row 2' }).fill('Beta');
  await dialog(page)
    .getByRole('button', { name: /^Date for Beta/ })
    .click();
  await day(page, '2026-11-12').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();

  await expect(summary).toHaveText('2 milestones · 1 upcoming');
  await expect(summary).toHaveAttribute('title', 'Next: Beta — Thu 12 Nov 2026');
  const button = (await page.getByRole('button', { name: 'Milestones' }).boundingBox())!;
  const text = (await summary.boundingBox())!;
  expect(text.x).toBeGreaterThan(button.x + button.width);
  expect(Math.abs(text.y + text.height / 2 - (button.y + button.height / 2))).toBeLessThan(2);
});

test('the "Actual dates" checkbox hides the blue lines and is remembered', async ({ page }) => {
  await addTask(page, 'Design', ['2026-11-02', '2026-11-06']);
  await timeline(page)
    .getByRole('button', { name: /^Design:/ })
    .click();
  await dialog(page)
    .getByRole('button', { name: /^Actual Start date/ })
    .click();
  await day(page, '2026-11-02').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();

  const checkbox = page.getByRole('checkbox', { name: 'Actual dates' });
  const line = page.getByTestId('actual-line');
  await expect(checkbox).toBeChecked();
  await expect(line).toHaveCount(1);

  await checkbox.uncheck();
  await expect(line).toHaveCount(0);
  await expect(totals(page)).toContainText('Actual 3D'); // only the lines are hidden

  await page.waitForTimeout(800); // autosave is debounced
  await page.reload();
  await expect(page.getByRole('button', { name: /^Design:/ })).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(line).toHaveCount(0);

  await checkbox.check();
  await expect(line).toHaveCount(1);
});

test.describe('at phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the totals and the toolbar fit without scrolling sideways', async ({ page }) => {
    await addTask(page, 'Design', ['2026-11-02', '2026-11-06']);
    // "Plan" for "Planned" (still read out in full), on one line within the 196 px panel.
    await expect(totals(page).getByText('Plan', { exact: true })).toBeVisible();
    await expect(totals(page).getByText('Planned', { exact: true })).toHaveCSS(
      'clip-path',
      'inset(50%)',
    );
    const box = (await totals(page).boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(196);
    expect(box.height).toBeLessThanOrEqual(28);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
    const critical = (await page.getByRole('button', { name: 'Critical path' }).boundingBox())!;
    expect(critical.x + critical.width).toBeLessThanOrEqual(375);
  });
});
