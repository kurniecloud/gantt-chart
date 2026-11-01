import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trackInputModality } from './inputModality';

let stop: () => void;
const modality = () => document.documentElement.dataset.input;

beforeEach(() => {
  stop = trackInputModality();
});

afterEach(() => {
  stop();
});

describe('trackInputModality', () => {
  it('is unset until the user does something, so keyboard-first users get focus rings', () => {
    expect(modality()).toBeUndefined();
  });

  it('switches to pointer on a mouse or touch press', () => {
    fireEvent.pointerDown(document.body);
    expect(modality()).toBe('pointer');
  });

  it.each([
    ['Shift on its own (screenshot shortcut)', { key: 'Shift', shiftKey: true }],
    ['⌘ on its own', { key: 'Meta', metaKey: true }],
    ['⌘Z (undo)', { key: 'z', metaKey: true }],
    ['Ctrl+Y (redo)', { key: 'y', ctrlKey: true }],
    ['Alt on its own', { key: 'Alt', altKey: true }],
    ['an unidentified key', { key: 'Unidentified' }],
    ['a synthetic key event without a key', { key: '' }],
  ])('stays pointer after %s', (_, init) => {
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, init);
    expect(modality()).toBe('pointer');
  });

  it.each([
    ['Tab', { key: 'Tab' }],
    ['Shift+Tab', { key: 'Tab', shiftKey: true }],
    ['an arrow key', { key: 'ArrowDown' }],
    ['Alt+Shift+↑ (move a task)', { key: 'ArrowUp', altKey: true, shiftKey: true }],
    ['Space', { key: ' ' }],
  ])('switches to keyboard on %s', (_, init) => {
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, init);
    expect(modality()).toBe('keyboard');
  });

  it('stops tracking and clears the attribute', () => {
    fireEvent.pointerDown(document.body);
    stop();
    expect(modality()).toBeUndefined();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(modality()).toBeUndefined();
    stop = trackInputModality();
  });
});
