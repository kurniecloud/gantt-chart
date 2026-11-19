import { describe, expect, it } from 'vitest';
import { MIN_PANEL_WIDTH, clampPanelWidth, maxPanelWidth, panelWidthForKey } from './panelWidth';

describe('maxPanelWidth', () => {
  it('is half the window', () => {
    expect(maxPanelWidth(1280)).toBe(640);
    expect(maxPanelWidth(1025)).toBe(512);
  });

  it('never drops below the minimum', () => {
    expect(maxPanelWidth(500)).toBe(MIN_PANEL_WIDTH);
  });
});

describe('clampPanelWidth', () => {
  it.each([
    [100, 320],
    [400.6, 401],
    [900, 640],
  ])('keeps %d within 320–640: %d', (width, expected) => {
    expect(clampPanelWidth(width, 640)).toBe(expected);
  });
});

describe('panelWidthForKey', () => {
  it.each([
    ['ArrowRight', false, 400, 416],
    ['ArrowLeft', false, 400, 384],
    ['ArrowRight', true, 400, 464],
    ['ArrowLeft', true, 350, 320],
    ['ArrowRight', true, 620, 640],
    ['Home', false, 500, 320],
    ['End', false, 400, 640],
  ])('%s (Shift: %s) from %d → %d', (key, shift, width, expected) => {
    expect(panelWidthForKey(key, shift, width, 640)).toBe(expected);
  });

  it('ignores other keys', () => {
    expect(panelWidthForKey('Enter', false, 400, 640)).toBeNull();
  });
});
