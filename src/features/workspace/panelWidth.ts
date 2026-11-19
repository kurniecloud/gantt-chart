/** The task panel's fixed width before it could be resized: now the narrowest it goes. */
export const MIN_PANEL_WIDTH = 320;
/** Phones keep a fixed, narrower panel and no divider: half their screen is below the minimum. */
export const PHONE_PANEL_WIDTH = 196;
export const PANEL_STEP = 16;
export const PANEL_BIG_STEP = 64;

/** The widest the panel may be: half the window, and never less than the minimum. */
export function maxPanelWidth(windowWidth: number): number {
  return Math.max(MIN_PANEL_WIDTH, Math.floor(windowWidth / 2));
}

/** A width kept between the minimum and the maximum, in whole pixels. */
export function clampPanelWidth(width: number, max: number): number {
  return Math.min(Math.max(Math.round(width), MIN_PANEL_WIDTH), max);
}

/** Where a key moves the divider (arrows step, Shift steps further, Home/End jump), or null. */
export function panelWidthForKey(
  key: string,
  shiftKey: boolean,
  width: number,
  max: number,
): number | null {
  const step = shiftKey ? PANEL_BIG_STEP : PANEL_STEP;
  switch (key) {
    case 'ArrowLeft':
      return clampPanelWidth(width - step, max);
    case 'ArrowRight':
      return clampPanelWidth(width + step, max);
    case 'Home':
      return MIN_PANEL_WIDTH;
    case 'End':
      return max;
    default:
      return null;
  }
}
