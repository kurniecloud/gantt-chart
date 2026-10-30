import { expect, test } from '@playwright/test';

test('first launch shows the sample project', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Sample project');
  await expect(page.getByRole('row', { name: /Gather requirements/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Launch/ })).toContainText('Milestone');
});

test('added tasks survive a reload, and undo works', async ({ page }) => {
  await page.goto('./');
  const newTaskRows = page.getByRole('row', { name: /New task/ });

  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(newTaskRows).toHaveCount(1);

  // Autosave is debounced; wait for it before reloading.
  await page.waitForTimeout(800);
  await page.reload();
  await expect(newTaskRows).toHaveCount(1);

  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(newTaskRows).toHaveCount(2);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(newTaskRows).toHaveCount(1);
});
