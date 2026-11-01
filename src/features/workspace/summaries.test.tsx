import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { shiftTaskDates } from '../../store/commands/taskCommands';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { useViewStore } from '../../store/viewStore';
import { makeProject } from '../../test/fixtures';

type Spec = Parameters<typeof makeProject>[0];

const WEDNESDAY = new Date(2026, 10, 4, 10, 0); // Wed 4 Nov 2026, 10:00 local

function setup(spec: Spec = {}) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(WEDNESDAY);
  useProjectStore.getState().loadProject(makeProject(spec));
  useUiStore.getState().closeDialog();
  const user = userEvent.setup();
  const view = render(<App storageAvailable />);
  return { user, ...view };
}

const totals = () => screen.getByTestId('project-totals');

/** The totals as screen readers get them: without the dots and the phone-only "Plan". */
function spokenTotals(): string {
  const copy = totals().cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
  return copy.textContent!.replace(/\s+/g, ' ').trim();
}

beforeEach(() => {
  localStorage.clear();
  useViewStore.setState({ mode: 'daily', showCriticalPath: false, showActualDates: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('project totals above "Task Name"', () => {
  const spec: Spec = {
    tasks: [
      { id: 'P', name: 'Website', collapsed: true },
      {
        id: 'A',
        name: 'Design',
        parent: 'P',
        start: '2026-11-02',
        finish: '2026-11-06',
        actualStart: '2026-11-03',
      },
      { id: 'B', name: 'Build', parent: 'P', start: '2026-11-05', finish: '2026-11-13' },
      { id: 'C', name: 'Launch', start: '2026-11-20', finish: '2026-11-20' },
    ],
  };

  it('counts top-level tasks and measures planned and actual length in weekdays', () => {
    setup(spec);
    // Mon 2 → Fri 20 Nov = 15 Weekdays; actual Tue 3 → today (Wed 4) = 2, still in progress.
    expect(spokenTotals()).toBe('2 Tasks Planned 15D Actual 2D');
    expect(totals()).toHaveTextContent(/^2 Tasks · Planned\s?Plan 15D · Actual 2D$/);
    expect(screen.getByTitle('2 Main Tasks, 3 Edge Tasks (Without Subtasks)')).toBeVisible();
    expect(
      screen.getByTitle('Planned: Mon 2 Nov 2026 – Fri 20 Nov 2026 (15 Weekdays)'),
    ).toBeVisible();
    expect(
      screen.getByTitle('Actual: Tue 3 Nov 2026 – Wed 4 Nov 2026 (2 Weekdays, In Progress)'),
    ).toBeVisible();
  });

  it('shows dashes when nothing is dated', () => {
    setup({ tasks: [{ id: 'A', name: 'Design' }] });
    expect(spokenTotals()).toBe('1 Task Planned — Actual —');
  });

  it('updates after a change and after undo', () => {
    setup(spec);
    act(() => {
      useProjectStore.getState().dispatch(shiftTaskDates('C', 'end', 5));
    });
    expect(spokenTotals()).toContain('Planned 20D');
    act(() => useProjectStore.getState().undo());
    expect(spokenTotals()).toContain('Planned 15D');
  });
});

describe('milestone summary beside the Milestones button', () => {
  it('counts milestones and how many are still to come', () => {
    setup({
      milestones: [
        { name: 'Kick-off', date: '2026-11-02' },
        { name: 'Beta', date: '2026-11-12' },
        { name: 'Launch', date: '2026-12-04' },
      ],
    });
    const summary = screen.getByTestId('milestone-summary');
    expect(summary).toHaveTextContent('3 Milestones · 2 Upcoming');
    expect(summary).toHaveAttribute('title', 'Next: Beta — Thu 12 Nov 2026');
  });

  it('says when there are none', () => {
    setup();
    expect(screen.getByTestId('milestone-summary')).toHaveTextContent('No Milestones');
  });
});

describe('"Actual Dates" toggle button', () => {
  const spec: Spec = {
    tasks: [
      {
        id: 'A',
        name: 'Design',
        start: '2026-11-02',
        finish: '2026-11-06',
        actualStart: '2026-11-02',
        actualFinish: '2026-11-04',
      },
    ],
  };
  const toggle = () => screen.getByRole('button', { name: 'Actual Dates' });

  it('is on by default and hides the actual lines when turned off', async () => {
    const { user } = setup(spec);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('actual-line')).toHaveLength(1);

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('actual-line')).not.toBeInTheDocument();
    // Only the lines are hidden: the totals still include the actual dates.
    expect(spokenTotals()).toContain('Actual 3D');
    expect(localStorage.getItem('gantt-chart:show-actual-dates')).toBe('hidden');

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('actual-line')).toHaveLength(1);
    expect(localStorage.getItem('gantt-chart:show-actual-dates')).toBe('shown');
  });

  it('sits just left of the Critical Path button', () => {
    setup(spec);
    expect(toggle().nextElementSibling).toBe(screen.getByRole('button', { name: 'Critical Path' }));
  });
});
