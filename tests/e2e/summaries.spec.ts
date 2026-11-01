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
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task Name' }).fill(name);
  await dialog(page)
    .getByRole('button', { name: /^Planned Start Date/ })
    .click();
  await day(page, dates[0]).click();
  await dialog(page)
    .getByRole('button', { name: /^Planned End Date/ })
    .click();
  await day(page, dates[1]).click();
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

test('totals above "Task Name" count top-level tasks and measure planned and actual weekdays', async ({
  page,
}) => {
  await expect(totals(page)).toHaveText('0 Tasks · Planned — · Actual —', { useInnerText: true });

  await addTask(page, 'Design', ['2026-11-02', '2026-11-06']);
  await addTask(page, 'Build', ['2026-11-09', '2026-11-13']);
  await expect(totals(page)).toHaveText('2 Tasks · Planned 10D · Actual —', {
    useInnerText: true,
  });
  await expect(totals(page).getByTitle(/Main Task/)).toHaveAttribute(
    'title',
    '2 Main Tasks, 2 Edge Tasks (Without Subtasks)',
  );

  // Design started on Tuesday and is still going: today is Wednesday → 2 Weekdays.
  await timeline(page)
    .getByRole('button', { name: /^Design:/ })
    .click();
  await dialog(page)
    .getByRole('button', { name: /^Actual Start Date/ })
    .click();
  await day(page, '2026-11-03').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(totals(page)).toHaveText('2 Tasks · Planned 10D · Actual 2D', {
    useInnerText: true,
  });
  await expect(totals(page).getByText('2D', { exact: true })).toHaveCSS('color', 'rgb(0, 98, 204)');

  // The task panel's header: totals level with the month row, "Task Name" with the day row.
  const months = (await page.getByText('November 2026').boundingBox())!;
  const totalsBox = (await totals(page).boundingBox())!;
  const heading = (await page.getByText('Task Name', { exact: true }).boundingBox())!;
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
  await expect(summary).toHaveText('No Milestones');

  await page.getByRole('button', { name: 'Milestones' }).click();
  await dialog(page).getByRole('button', { name: 'Add Milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone Name, Row 1' }).fill('Kick-off');
  await dialog(page)
    .getByRole('button', { name: /^Date for Kick-off/ })
    .click();
  await day(page, '2026-11-02').click();
  await dialog(page).getByRole('button', { name: 'Add Milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone Name, Row 2' }).fill('Beta');
  await dialog(page)
    .getByRole('button', { name: /^Date for Beta/ })
    .click();
  await day(page, '2026-11-12').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();

  await expect(summary).toHaveText('2 Milestones · 1 Upcoming');
  await expect(summary).toHaveAttribute('title', 'Next: Beta — Thu 12 Nov 2026');
  const button = (await page.getByRole('button', { name: 'Milestones' }).boundingBox())!;
  const text = (await summary.boundingBox())!;
  expect(text.x).toBeGreaterThan(button.x + button.width);
  expect(Math.abs(text.y + text.height / 2 - (button.y + button.height / 2))).toBeLessThan(2);
});

test('the "Actual Dates" button hides the blue lines and is remembered', async ({ page }) => {
  await addTask(page, 'Design', ['2026-11-02', '2026-11-06']);
  await timeline(page)
    .getByRole('button', { name: /^Design:/ })
    .click();
  await dialog(page)
    .getByRole('button', { name: /^Actual Start Date/ })
    .click();
  await day(page, '2026-11-02').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();

  const toggle = page.getByRole('button', { name: 'Actual Dates' });
  const critical = page.getByRole('button', { name: 'Critical Path' });
  const line = page.getByTestId('actual-line');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveCSS('border-color', 'rgb(10, 132, 255)'); // "on": actual blue
  await expect(line).toHaveCount(1);
  // The same kind of button as Critical Path, right next to it.
  const [toggleBox, criticalBox] = [(await toggle.boundingBox())!, (await critical.boundingBox())!];
  expect(toggleBox.height).toBe(criticalBox.height);
  expect(toggleBox.y).toBe(criticalBox.y);
  expect(criticalBox.x - (toggleBox.x + toggleBox.width)).toBeCloseTo(8, 0);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveCSS('border-color', 'rgb(226, 229, 234)'); // plain, like Critical Path off
  await expect(line).toHaveCount(0);
  await expect(totals(page)).toContainText('Actual 3D'); // only the lines are hidden

  await page.waitForTimeout(800); // autosave is debounced
  await page.reload();
  await expect(page.getByRole('button', { name: /^Design:/ })).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(line).toHaveCount(0);

  await toggle.click();
  await expect(line).toHaveCount(1);
});

test('a clicked toolbar button shows no focus ring after Shift or ⌘, but Tab does', async ({
  page,
}) => {
  // The owner's screenshot: "Actual Dates" turned off by a click, then a screenshot shortcut
  // (⌘⇧4) made Chrome draw the blue keyboard-focus ring, which looks like the "on" border.
  const toggle = page.getByRole('button', { name: 'Actual Dates' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Shift');
  await page.keyboard.press('Meta+Shift');
  await expect(toggle).toBeFocused();
  // Chrome itself now treats the button as keyboard-focused…
  expect(await toggle.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
  // …but no ring is drawn.
  await expect(toggle).toHaveCSS('outline-style', 'none');

  // The same for the Daily / Weekly control.
  await page.getByText('Weekly', { exact: true }).click();
  await page.keyboard.press('Shift');
  await expect(page.locator('label', { hasText: 'Weekly' })).toHaveCSS('outline-style', 'none');

  // Real keyboard use still shows the ring.
  await toggle.click();
  await page.keyboard.press('Tab');
  const critical = page.getByRole('button', { name: 'Critical Path' });
  await expect(critical).toBeFocused();
  await expect(critical).toHaveCSS('outline-style', 'solid');
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
    const critical = (await page.getByRole('button', { name: 'Critical Path' }).boundingBox())!;
    expect(critical.x + critical.width).toBeLessThanOrEqual(375);
  });
});
