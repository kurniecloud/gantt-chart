import { expect, test, type Page } from '@playwright/test';

/** RGB values of one row of screen pixels (decoded by the browser itself). */
async function pixelRow(page: Page, clip: { x: number; y: number; width: number }) {
  const png = await page.screenshot({ clip: { ...clip, height: 1 } });
  const rgba = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return Array.from(ctx.getImageData(0, 0, img.width, 1).data);
  }, png.toString('base64'));
  const pixels: number[][] = [];
  for (let i = 0; i < rgba.length; i += 4) pixels.push(rgba.slice(i, i + 3));
  return pixels;
}

/** Centres of the runs of non-background pixels, in screen x. */
function lineCentres(pixels: number[][], startX: number) {
  const background = pixels[0]!; // the clip starts just right of a week line
  const isLine = (p: number[]) => p.some((v, i) => Math.abs(v - background[i]!) > 3);
  const centres: number[] = [];
  let runStart = -1;
  pixels.forEach((p, x) => {
    if (isLine(p) && runStart < 0) runStart = x;
    if (!isLine(p) && runStart >= 0) {
      centres.push(startX + (runStart + x - 1) / 2);
      runStart = -1;
    }
  });
  return centres;
}

test('weekly view: every week has exactly four evenly spaced day lines', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 600 });
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10, 0));
  await page.goto('./');
  await page.getByText('Weekly', { exact: true }).click();
  // Move away from today's highlight so only grid lines remain.
  await page.getByTestId('workspace-scroller').evaluate((el) => el.scrollBy({ left: 144 * 10 }));

  const body = (await page.getByRole('group', { name: 'Timeline' }).boundingBox())!;
  const panelRight = (await page.getByRole('list', { name: 'Tasks' }).boundingBox())!;
  const left = Math.ceil(panelRight.x + panelRight.width);
  // First week boundary on screen, then sample 6 whole weeks from just after it.
  const firstBoundary = body.x + Math.ceil((left - body.x) / 144) * 144;
  const y = body.y + 300; // below the rows: grid lines only
  const pixels = await pixelRow(page, { x: firstBoundary + 2, y, width: 144 * 6 - 4 });
  const lines = lineCentres(pixels, firstBoundary + 2);

  for (let week = 0; week < 6; week++) {
    const start = firstBoundary + week * 144;
    const inside = lines.filter((x) => x > start + 3 && x < start + 141);
    expect(inside, `week ${week + 1}`).toHaveLength(4);
    inside.forEach((x, i) => expect(Math.abs(x - (start + (144 / 5) * (i + 1)))).toBeLessThan(1.5));
  }
});
