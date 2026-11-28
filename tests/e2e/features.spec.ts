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
/** The Milestones dialog's names, top to bottom. */
const milestoneNames = (page: Page) =>
  dialog(page)
    .getByRole('textbox')
    .evaluateAll((boxes) => boxes.map((box) => (box as HTMLInputElement).value));

async function addTask(page: Page, name: string, dates?: [string, string], blockedBy?: string) {
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Task Name' }).fill(name);
  if (dates) {
    await dialog(page)
      .getByRole('button', { name: /^Planned Start Date/ })
      .click();
    await day(page, dates[0]).click();
    await dialog(page)
      .getByRole('button', { name: /^Planned End Date/ })
      .click();
    await day(page, dates[1]).click();
  }
  if (blockedBy) {
    await dialog(page)
      .getByRole('combobox', { name: 'Is Blocked By' })
      .selectOption({ label: blockedBy });
  }
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
}

test('export downloads the project and import brings it back', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Project Title' }).fill('Website relaunch');
  await page.getByRole('textbox', { name: 'Project Title' }).press('Enter');
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
  await page.getByRole('textbox', { name: 'Project Title' }).fill('Something else');
  await page.getByRole('textbox', { name: 'Project Title' }).press('Enter');
  await page.getByRole('button', { name: 'Delete Design' }).click();
  await dialog(page).getByRole('button', { name: 'Delete' }).click();

  await page.getByLabel('Project File to Import').setInputFiles(path);
  await expect(dialog(page)).toHaveAccessibleName(/^Import “.*”\?$/);
  await dialog(page).getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('textbox', { name: 'Project Title' })).toHaveValue(
    'Website relaunch',
  );
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeVisible();
  await expect(page.getByText('(3D)')).toBeVisible();
});

test('New exports on Yes, then starts an empty project that survives a reload', async ({
  page,
}) => {
  await page.getByRole('textbox', { name: 'Project Title' }).fill('Website relaunch');
  await page.getByRole('textbox', { name: 'Project Title' }).press('Enter');
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']);

  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(dialog(page)).toHaveAccessibleName('Start a New Project?');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog(page).getByRole('button', { name: 'Yes' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('website-relaunch.gantt.json');
  const file = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(file.project.name).toBe('Website relaunch');
  expect(file.project.taskOrder).toHaveLength(1);

  await expect(dialog(page)).toBeHidden();
  const title = page.getByRole('textbox', { name: 'Project Title' });
  await expect(title).toHaveValue('Untitled Project');
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeHidden();

  await page.waitForTimeout(800); // autosave
  await page.reload();
  await expect(title).toHaveValue('Untitled Project');
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeHidden();
});

test('New with No confirms, clears without a download, and undo brings it back', async ({
  page,
}) => {
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']);
  const newButton = page.getByRole('button', { name: 'New', exact: true });
  let downloads = 0;
  page.on('download', () => (downloads += 1));

  await newButton.click();
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(newButton).toBeFocused();

  await newButton.click();
  await dialog(page).getByRole('button', { name: 'No' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Clear Without Exporting?');

  // Cancel closes everything and hands focus back to the button.
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(newButton).toBeFocused();
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeVisible();

  await newButton.click();
  await dialog(page).getByRole('button', { name: 'No' }).click();
  await dialog(page).getByRole('button', { name: 'Clear Project' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeHidden();
  expect(downloads).toBe(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeVisible();
});

test('New does nothing on a project with no tasks or milestones', async ({ page }) => {
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
});

test('JSON Editor edits the whole project as text, without any file', async ({ page }) => {
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']);
  const open = page.getByRole('button', { name: 'JSON Editor' });
  await open.click();
  await expect(dialog(page)).toHaveAccessibleName('JSON Editor');
  const editor = dialog(page).getByRole('textbox', { name: 'Project JSON' });
  const status = dialog(page).getByRole('status');
  const file = JSON.parse(await editor.inputValue());
  expect(file.format).toBe('gantt-chart');

  await editor.fill('{\n  "format": "gantt-chart",\n}');
  await dialog(page).getByRole('button', { name: 'Validate' }).click();
  await expect(status).toHaveText("This isn't valid JSON (line 3, column 1).");

  file.project.name = 'Edited in JSON';
  file.project.tasks[file.project.taskOrder[0]].name = 'Design v2';
  await editor.fill(JSON.stringify(file, null, 2));
  await expect(status).toHaveText('');
  await dialog(page).getByRole('button', { name: 'Validate' }).click();
  await expect(status).toHaveText('Valid: 1 task and 0 milestones.');

  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(open).toBeFocused();
  const title = page.getByRole('textbox', { name: 'Project Title' });
  await expect(title).toHaveValue('Edited in JSON');
  await expect(page.getByRole('button', { name: 'Design v2', exact: true })).toBeVisible();

  await page.waitForTimeout(800); // autosave
  await page.reload();
  await expect(title).toHaveValue('Edited in JSON');
});

test('JSON Editor shows the project as a table and copies it for a spreadsheet', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // What the copy writes, as the spreadsheet app will read it.
  await page.evaluate(() => {
    window.addEventListener('copy', (event) => {
      const copied = {
        html: event.clipboardData?.getData('text/html'),
        text: event.clipboardData?.getData('text/plain'),
      };
      Object.assign(window, { copied });
    });
  });
  await page.getByRole('button', { name: 'JSON Editor' }).click();
  const editor = dialog(page).getByRole('textbox', { name: 'Project JSON' });
  const file = JSON.parse(await editor.inputValue());
  const task = (id: string, name: string, parentId: string | null, extra = {}) => ({
    id,
    parentId,
    name,
    mode: 'manual',
    percentComplete: 0,
    ...extra,
  });
  const tasks = [
    task('t1', 'Test', null),
    task('t2', 'sub test 1', 't1'),
    task('t3', 'sub sub test', 't2'),
    task('t4', 'sub sub sub test a', 't3', {
      start: '2026-11-02',
      finish: '2026-11-06',
      actualStart: '2026-11-02',
      actualFinish: '2026-11-05',
      owner: 'Ana',
      notes: 'First line\nSecond line',
    }),
    task('t5', 'sub sub test 2', 't3', { start: '2026-11-09', actualStart: '2026-11-10' }),
    task('t6', 'Build', null),
    task('t7', 'Design UI', 't6', { priority: 'high' }),
  ];
  Object.assign(file.project, {
    name: 'Website',
    tasks: Object.fromEntries(tasks.map((t) => [t.id, t])),
    taskOrder: tasks.map((t) => t.id),
    dependencies: {
      d1: { id: 'd1', predecessorId: 't4', successorId: 't5', type: 'FS', lagDays: 0 },
    },
    milestones: [{ id: 'm1', name: 'Go live', date: '2026-11-20' }],
  });
  const text = JSON.stringify(file, null, 2);
  // Not saved: the table comes from the text in the editor.
  await editor.fill(text);

  await dialog(page).getByRole('button', { name: 'Spreadsheet' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Copy Table' })).toBeFocused();
  const tasksTable = dialog(page).getByRole('table', { name: 'Tasks' });
  await expect(tasksTable.getByRole('row')).toHaveCount(8);
  await expect(tasksTable.getByRole('row').nth(5).getByRole('cell')).toHaveText([
    '1.1.1.2',
    'sub sub test 2',
    '9 Nov 2026',
    '',
    '10 Nov 2026',
    '',
    'In Progress',
    '',
    '1.1.1.1',
    '',
    'None',
    '',
  ]);
  await expect(tasksTable.getByRole('row').nth(1).getByRole('cell').nth(6)).toHaveText(
    'In Progress',
  );

  await dialog(page).getByRole('button', { name: 'Copy Table' }).click();
  await expect(dialog(page).getByRole('status')).toHaveText(
    'Copied 7 task rows and 1 milestone. Paste them into a spreadsheet.',
  );
  const copied = await page.evaluate(
    () => (window as unknown as { copied: { html: string; text: string } }).copied,
  );
  expect(copied.html).toContain(`mso-number-format:'\\@'">1.1.1.2</td>`);
  expect(copied.html).toContain(`First line<br style="mso-data-placement:same-cell">Second line`);
  expect(copied.text.split('\n').slice(0, 4)).toEqual([
    'Website',
    '',
    'Task Id\tTask Name\tPlanned Start Date\tPlanned End Date\tActual Start Date\tActual End Date\tStatus\tOwner\tIs Blocked By\tIs Blocking\tPriority\tRemarks',
    '1\tTest\t2026-11-02\t2026-11-09\t2026-11-02\t\tIn Progress\t\t\t\tNone\t',
  ]);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(copied.text);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(dialog(page).getByRole('button', { name: 'Save' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await dialog(page).getByRole('button', { name: 'Back to JSON' }).click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue(text);
});

test('milestones are managed in a dialog and shown in green', async ({ page }) => {
  await page.getByRole('button', { name: 'Milestones' }).click();
  await dialog(page).getByRole('button', { name: 'Add Milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone Name, Row 1' }).fill('Sign-off');
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

test('milestones re-sort by date as dates are picked or cleared, flashing the moved row', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Milestones' }).click();
  const rows = dialog(page).locator('tbody > tr');
  const dateOf = (name: string) =>
    dialog(page).getByRole('button', { name: new RegExp(`^Date for ${name}`) });
  const addMilestone = async (name: string, iso: string) => {
    await dialog(page).getByRole('button', { name: 'Add Milestone' }).click();
    await dialog(page).getByRole('textbox').last().fill(name);
    await dateOf(name).click();
    await day(page, iso).click();
  };

  await addMilestone('Launch', '2026-11-20');
  await addMilestone('Kick-off', '2026-11-02');
  await expect.poll(() => milestoneNames(page)).toEqual(['Kick-off', 'Launch']);
  await expect(dateOf('Kick-off')).toBeFocused();
  await expect(rows.nth(0)).toHaveClass(/moved/);
  await expect(rows.nth(1)).not.toHaveClass(/moved/);
  // The tint shows, then fades and the flash ends by itself.
  const tint = await rows.nth(0).evaluate((row) => getComputedStyle(row).animationName);
  expect(tint).toMatch(/moved/);
  await expect(rows.nth(0)).not.toHaveClass(/moved/, { timeout: 3000 });

  await dialog(page).getByRole('button', { name: 'Clear Date for Kick-off' }).click();
  await expect.poll(() => milestoneNames(page)).toEqual(['Launch', 'Kick-off']);
  await expect(dateOf('Kick-off')).toBeFocused();
  await expect(rows.nth(1)).toHaveClass(/moved/);

  await dateOf('Kick-off').click();
  await day(page, '2026-11-02').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();
  await page.getByRole('button', { name: 'Milestones' }).click();
  await expect.poll(() => milestoneNames(page)).toEqual(['Kick-off', 'Launch']);
});

test('a milestone that moves out of view is scrolled into view', async ({ page }) => {
  // Fifteen weekday milestones, 9–27 Nov, are more than the dialog shows in a short window.
  await page.setViewportSize({ width: 1280, height: 480 });
  const dates = [9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27];
  await page.getByRole('button', { name: 'JSON Editor' }).click();
  const editor = dialog(page).getByRole('textbox', { name: 'Project JSON' });
  const file = JSON.parse(await editor.inputValue());
  file.project.milestones = dates.map((d, i) => ({
    id: `m${i}`,
    name: `M${i + 1}`,
    date: `2026-11-${String(d).padStart(2, '0')}`,
  }));
  await editor.fill(JSON.stringify(file));
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();

  await page.getByRole('button', { name: 'Milestones' }).click();
  await dialog(page).evaluate((box) => box.scrollTo({ top: 0 }));
  const rows = dialog(page).locator('tbody > tr');
  await expect(rows.last()).not.toBeInViewport();
  const pageScroll = await page.evaluate(() => document.scrollingElement!.scrollTop);
  await dialog(page).getByRole('button', { name: 'Clear Date for M1', exact: true }).click();
  await expect(dialog(page).getByRole('textbox').last()).toHaveValue('M1');
  await expect(rows.last()).toBeInViewport();
  await expect(rows.last()).toHaveClass(/moved/);
  await expect(dialog(page).getByRole('button', { name: /^Date for M1 / })).toBeFocused();
  // Only the dialog scrolls, never the page behind it.
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(pageScroll);
});

test('a milestone scrolled behind the task panel does not show over it', async ({ page }) => {
  await page.getByRole('button', { name: 'Milestones' }).click();
  await dialog(page).getByRole('button', { name: 'Add Milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone Name, Row 1' }).fill('Kick-off');
  await dialog(page)
    .getByRole('button', { name: /^Date for Kick-off/ })
    .click();
  await day(page, '2026-11-02').click(); // Monday: left of today's first column, under the panel
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toBeHidden();

  const marker = page.getByRole('img', { name: /^Milestone: Kick-off/ });
  const box = (await marker.boundingBox())!;
  const panel = (await page.getByRole('list', { name: 'Tasks' }).boundingBox())!;
  expect(box.x + box.width).toBeLessThan(panel.x + panel.width);
  // The ◆'s lower half hangs below the header, over the task panel: the panel must cover it.
  const covered = await marker.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return !el.contains(document.elementFromPoint(r.x + r.width / 2, r.bottom - 2));
  });
  expect(covered).toBe(true);
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

  await page.getByRole('button', { name: 'Critical Path' }).click();
  await expect(page.getByText('2 Critical Tasks')).toBeVisible();

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

test('blocking links are drawn as arrows from bar end to bar start', async ({ page }) => {
  await addTask(page, 'Design', ['2026-11-04', '2026-11-06']);
  await addTask(page, 'Build', ['2026-11-11', '2026-11-12'], 'Design');

  const arrow = page.getByTestId('dependency-arrow');
  await expect(arrow).toHaveCount(1);
  await expect(arrow).not.toHaveAttribute('data-broken');
  const line = arrow.locator('path').first();
  await expect(line).toHaveCSS('stroke', 'rgb(139, 149, 163)'); // grey

  const design = (await timeline(page)
    .getByRole('button', { name: /^Design:/ })
    .boundingBox())!;
  const build = (await timeline(page)
    .getByRole('button', { name: /^Build:/ })
    .boundingBox())!;
  // The line's first and last points in screen pixels (its box would include the arrowhead).
  const ends = await line.evaluate((el) => {
    const path = el as SVGPathElement;
    const toScreen = (p: DOMPoint) => p.matrixTransform(path.getScreenCTM()!);
    const first = toScreen(path.getPointAtLength(0));
    const last = toScreen(path.getPointAtLength(path.getTotalLength()));
    return { x1: first.x, y1: first.y, x2: last.x, y2: last.y };
  });
  expect(Math.abs(ends.x1 - (design.x + design.width))).toBeLessThanOrEqual(1); // Design's end
  expect(Math.abs(ends.y1 - (design.y + design.height / 2))).toBeLessThanOrEqual(1);
  expect(Math.abs(ends.x2 - build.x)).toBeLessThanOrEqual(1); // Build's start
  expect(Math.abs(ends.y2 - (build.y + build.height / 2))).toBeLessThanOrEqual(1);

  // Move Build so it overlaps Design: the arrow turns dashed amber.
  await timeline(page)
    .getByRole('button', { name: /^Build:/ })
    .click();
  await dialog(page)
    .getByRole('button', { name: /^Planned Start Date/ })
    .click();
  await day(page, '2026-11-05').click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(arrow).toHaveAttribute('data-broken', 'true');
  await expect(line).toHaveCSS('stroke', 'rgb(217, 119, 6)');
});
