import { expect, test, type Page } from '@playwright/test';

// Thursday 19 November 2026, 10:00 local time.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 19, 10, 0));
  await page.goto('./');
});

const dialog = (page: Page) => page.getByRole('dialog');

/** Where the open calendar's columns sit: weekday headings vs. the days of one week. */
function calendarColumns(page: Page) {
  return dialog(page)
    .getByRole('grid')
    .evaluate((grid) => {
      const centre = (el: Element) => {
        const box = el.getBoundingClientRect();
        return Math.round(box.x + box.width / 2);
      };
      const week = grid.querySelectorAll('tbody tr')[2]!;
      const cell = week.querySelector('td')!;
      let scroller: HTMLElement | null = grid as HTMLElement;
      while (scroller && getComputedStyle(scroller).overflowX !== 'auto') {
        scroller = scroller.parentElement;
      }
      const friday = grid.querySelectorAll('thead th')[4]!;
      return {
        headings: [...grid.querySelectorAll('thead th')].map(centre),
        days: [...week.querySelectorAll('td button')].map(centre),
        cellWidth: Math.round(cell.getBoundingClientRect().width),
        rowBorder: getComputedStyle(cell).borderBottomWidth,
        fridayShown:
          friday.getBoundingClientRect().right <= scroller!.getBoundingClientRect().right + 0.5,
      };
    });
}

test('the Milestones calendar lines up exactly like the task dialog’s', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await dialog(page)
    .getByRole('button', { name: /^Planned Start Date/ })
    .click();
  const task = await calendarColumns(page);
  expect(task.days).toEqual(task.headings);
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Milestones' }).click();
  await dialog(page).getByRole('button', { name: 'Add Milestone' }).click();
  await dialog(page).getByRole('textbox', { name: 'Milestone Name, Row 1' }).fill('M1');
  await dialog(page)
    .getByRole('button', { name: /^Date for M1/ })
    .click();
  const milestone = await calendarColumns(page);

  expect(milestone.days).toEqual(milestone.headings); // each day centred under its weekday
  expect(milestone.cellWidth).toBe(task.cellWidth);
  expect(milestone.rowBorder).toBe('0px'); // no table lines between weeks
  expect(milestone.fridayShown).toBe(true);
});

test('the calendar uses the theme’s accent colour, not plain blue', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await dialog(page)
    .getByRole('button', { name: /^Planned Start Date/ })
    .click();
  const colours = await dialog(page)
    .getByRole('grid')
    .evaluate((grid) => {
      const root = grid.closest('.rdp-root')!;
      return {
        accent: getComputedStyle(document.body).getPropertyValue('--color-accent').trim(),
        arrow: getComputedStyle(root.querySelector('.rdp-chevron')!).fill,
        today: getComputedStyle(root.querySelector('.rdp-today button, .rdp-today')!).color,
      };
    });
  expect(colours.accent).toBe('#2563eb');
  expect(colours.arrow).toBe('rgb(37, 99, 235)');
  expect(colours.today).toBe('rgb(37, 99, 235)');
});

test('an open calendar doesn’t stretch the fields in the box beside it', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  const actualStart = dialog(page).getByRole('button', { name: /^Actual Start Date/ });
  const before = (await actualStart.boundingBox())!.height;
  await dialog(page)
    .getByRole('button', { name: /^Planned Start Date/ })
    .click();
  await expect(dialog(page).getByRole('grid')).toBeVisible();
  expect((await actualStart.boundingBox())!.height).toBe(before);
});
