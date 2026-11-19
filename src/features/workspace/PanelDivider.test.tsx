import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { useViewStore } from '../../store/viewStore';
import { makeProject } from '../../test/fixtures';

const KEY = 'gantt-chart:task-panel-width';

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  act(() => void window.dispatchEvent(new Event('resize')));
}

function setup() {
  useProjectStore
    .getState()
    .loadProject(makeProject({ tasks: [{ id: 'A', name: 'A very long task name' }] }));
  useUiStore.getState().closeDialog();
  const user = userEvent.setup();
  render(<App storageAvailable />);
  return user;
}

const divider = () => screen.getByRole('separator', { name: 'Resize Task Panel' });
const shownWidth = () =>
  screen
    .getByTestId('workspace-scroller')
    .parentElement!.style.getPropertyValue('--task-panel-width');

beforeEach(() => {
  localStorage.clear();
  useViewStore.setState({ taskPanelWidth: null });
  setWindowWidth(1024);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setWindowWidth(1024);
});

describe('task panel divider', () => {
  it('starts at the old fixed width and allows up to half the window', () => {
    setup();
    expect(divider()).toHaveAttribute('aria-valuenow', '320');
    expect(divider()).toHaveAttribute('aria-valuemin', '320');
    expect(divider()).toHaveAttribute('aria-valuemax', '512');
    expect(shownWidth()).toBe('320px');
  });

  it('follows a drag, stays within the limits, and remembers the result', () => {
    setup();
    fireEvent.pointerDown(divider(), { button: 0, clientX: 320 });
    fireEvent.pointerMove(window, { clientX: 450 });
    expect(shownWidth()).toBe('450px');
    expect(localStorage.getItem(KEY)).toBeNull(); // only saved when the drag ends

    fireEvent.pointerMove(window, { clientX: 900 });
    expect(shownWidth()).toBe('512px'); // half the window
    fireEvent.pointerMove(window, { clientX: 100 });
    expect(shownWidth()).toBe('320px'); // the old fixed width
    fireEvent.pointerMove(window, { clientX: 420 });
    fireEvent.pointerUp(window);

    expect(divider()).toHaveAttribute('aria-valuenow', '420');
    expect(localStorage.getItem(KEY)).toBe('420');
    expect(useViewStore.getState().taskPanelWidth).toBe(420);
  });

  it('can be moved with the keyboard', async () => {
    const user = setup();
    divider().focus();
    await user.keyboard('{ArrowRight}');
    expect(shownWidth()).toBe('336px');
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(shownWidth()).toBe('400px');
    await user.keyboard('{ArrowLeft}');
    expect(shownWidth()).toBe('384px');
    await user.keyboard('{End}');
    expect(shownWidth()).toBe('512px');
    await user.keyboard('{Home}');
    expect(shownWidth()).toBe('320px');
  });

  it('goes back to the narrowest width on double-click', async () => {
    useViewStore.setState({ taskPanelWidth: 480 });
    const user = setup();
    expect(shownWidth()).toBe('480px');
    await user.dblClick(divider());
    expect(shownWidth()).toBe('320px');
    expect(localStorage.getItem(KEY)).toBe('320');
  });

  it('fits a narrower window, and gets the chosen width back when there is room', () => {
    useViewStore.setState({ taskPanelWidth: 480 });
    setup();
    setWindowWidth(800);
    expect(shownWidth()).toBe('400px');
    setWindowWidth(1280);
    expect(shownWidth()).toBe('480px');
  });

  it('is not offered on phones, which keep their fixed panel', () => {
    // jsdom has no matchMedia; pretend to be a phone-sized screen.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(max-width: 720px)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    useViewStore.setState({ taskPanelWidth: 480 });
    setup();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(shownWidth()).toBe('196px');
  });
});
