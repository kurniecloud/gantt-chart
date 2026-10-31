import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { updateTask } from '../../store/commands/taskCommands';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { useViewStore } from '../../store/viewStore';
import { makeProject } from '../../test/fixtures';
import { DAY_WIDTH, WEEK_WIDTH, columnOfDate, createScale } from './scale';

type Spec = Parameters<typeof makeProject>[0];

const WEDNESDAY = new Date(2026, 10, 4, 10, 0); // Wed 4 Nov 2026, 10:00 local
const SATURDAY = new Date(2026, 9, 31, 10, 0); // Sat 31 Oct 2026

function setup(spec: Spec = {}, now = WEDNESDAY) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  useProjectStore.getState().loadProject(makeProject(spec));
  useUiStore.getState().closeDialog();
  const user = userEvent.setup();
  const view = render(<App storageAvailable />);
  return { user, ...view };
}

const scroller = () => screen.getByTestId('workspace-scroller');
const timeline = () => screen.getByRole('group', { name: 'Timeline' });
const bar = (name: RegExp) => within(timeline()).getByRole('button', { name });
const todayHeader = (container: HTMLElement) => container.querySelector('[data-today]');

beforeEach(() => {
  localStorage.clear();
  useViewStore.setState({ mode: 'daily', showCriticalPath: false });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('daily view', () => {
  it('opens with today as the first column, highlighted', () => {
    const { container } = setup();
    const daily = createScale('daily', '2026-11-04');
    expect(scroller().scrollLeft).toBe(columnOfDate(daily, '2026-11-04') * DAY_WIDTH);
    expect(todayHeader(container)).toHaveTextContent('Wed 4');
    expect(screen.getByTestId('today-highlight')).toHaveStyle({ width: `${DAY_WIDTH}px` });
    expect(screen.getByRole('radio', { name: 'Daily' })).toBeChecked();
  });

  it('shows only weekdays in the header', () => {
    const { container } = setup();
    const labels = [...container.querySelectorAll('[data-week-start], [data-today]')].map(
      (el) => el.textContent,
    );
    expect(labels).toContain('Mon 2');
    expect(container.textContent).not.toMatch(/Sat \d|Sun \d/);
  });

  it('on a weekend opens on Monday with no day highlighted', () => {
    const { container } = setup({}, SATURDAY);
    const daily = createScale('daily', '2026-10-31');
    expect(scroller().scrollLeft).toBe(columnOfDate(daily, '2026-11-02') * DAY_WIDTH);
    expect(todayHeader(container)).toBeNull();
    expect(screen.queryByTestId('today-highlight')).not.toBeInTheDocument();
  });
});

describe('task bars', () => {
  const spec: Spec = {
    tasks: [
      { id: 'P', name: 'Website' },
      {
        id: 'A',
        name: 'Design',
        parent: 'P',
        start: '2026-11-02',
        finish: '2026-11-06',
        priority: 'high',
      },
      { id: 'B', name: 'Review', parent: 'P', start: '2026-11-09' }, // start only
      { id: 'C', name: 'Someday' }, // no dates
    ],
  };

  it('draws dated tasks with their dates, priority colour and width', () => {
    setup(spec);
    const design = bar(/^Design: Mon 2 Nov 2026 – Fri 6 Nov 2026 · High priority$/);
    expect(design).toHaveStyle({ width: `${5 * DAY_WIDTH}px` });
    expect(design.style.getPropertyValue('--bar-color')).toBe('var(--color-priority-high)');

    const review = bar(/^Review: Mon 9 Nov 2026 · No priority$/); // 1-day bar
    expect(review).toHaveStyle({ width: `${DAY_WIDTH}px` });
    expect(review.style.getPropertyValue('--bar-color')).toBe('var(--color-priority-none)');
  });

  it('draws no bar for a task without dates', () => {
    setup(spec);
    expect(within(timeline()).queryByRole('button', { name: /^Someday/ })).toBeNull();
  });

  it('draws a parent as a bracket spanning its subtasks', () => {
    setup(spec);
    const website = bar(/^Website: Mon 2 Nov 2026 – Mon 9 Nov 2026/);
    expect(website.className).toMatch(/summaryBar/);
    expect(website).toHaveStyle({ width: `${6 * DAY_WIDTH}px` }); // Mon 2 → Mon 9, weekend skipped
  });

  it('opens the edit dialog when a bar is clicked', async () => {
    const { user } = setup(spec);
    await user.click(bar(/^Design:/));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Edit task');
    expect(
      within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Task name' }),
    ).toHaveValue('Design');
  });

  it('hides the bars of collapsed subtasks', async () => {
    const { user } = setup(spec);
    await user.click(screen.getByRole('button', { name: 'Collapse Website' }));
    expect(within(timeline()).queryByRole('button', { name: /^Design:/ })).toBeNull();
    expect(bar(/^Website:/)).toBeInTheDocument();
  });

  it('updates a bar when the task is edited', async () => {
    const { user } = setup(spec);
    await user.click(bar(/^Design:/));
    await user.click(within(screen.getByRole('dialog')).getByText('Low'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    expect(bar(/^Design:.*Low priority$/).style.getPropertyValue('--bar-color')).toBe(
      'var(--color-priority-low)',
    );
  });
});

describe('weekly view', () => {
  const spec: Spec = {
    tasks: [{ id: 'A', name: 'Design', start: '2026-11-04', finish: '2026-11-05' }], // Wed–Thu
  };

  it('labels weeks, uses 3× wider columns and keeps exact days within a week', async () => {
    const { user, container } = setup(spec);
    await user.click(screen.getByText('Weekly'));

    expect(screen.getByRole('radio', { name: 'Weekly' })).toBeChecked();
    expect(todayHeader(container)).toHaveTextContent('2 Nov - 6 Nov');
    // Today (Wednesday) is highlighted as its own fifth of the week, not the whole week.
    const highlight = screen.getByTestId('today-highlight');
    const weekly = createScale('weekly', '2026-11-04');
    expect(parseFloat(highlight.style.width)).toBeCloseTo(WEEK_WIDTH / 5);
    expect(parseFloat(highlight.style.left)).toBeCloseTo(
      columnOfDate(weekly, '2026-11-04') * WEEK_WIDTH + 2 * (WEEK_WIDTH / 5),
    );
    const design = bar(/^Design:/);
    expect(parseFloat(design.style.width)).toBeCloseTo((2 * WEEK_WIDTH) / 5);
  });

  it('remembers the choice for next time', async () => {
    const { user } = setup(spec);
    await user.click(screen.getByText('Weekly'));
    expect(localStorage.getItem('gantt-chart:view-mode')).toBe('weekly');
  });

  it('highlights the week just ending on a weekend', async () => {
    const { user, container } = setup(spec, SATURDAY);
    await user.click(screen.getByText('Weekly'));
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(todayHeader(container)).toHaveTextContent('26 Oct - 30 Oct');
  });
});

describe('scrolling', () => {
  it('keeps the same dates in view when switching views', async () => {
    const { user } = setup();
    const daily = createScale('daily', '2026-11-04');
    const weekly = createScale('weekly', '2026-11-04');
    act(() => scroller().scrollTo({ left: columnOfDate(daily, '2026-10-14') * DAY_WIDTH })); // a Wednesday

    await user.click(screen.getByText('Weekly'));
    expect(scroller().scrollLeft).toBe(columnOfDate(weekly, '2026-10-12') * WEEK_WIDTH);

    await user.click(screen.getByText('Daily'));
    expect(scroller().scrollLeft).toBe(columnOfDate(daily, '2026-10-12') * DAY_WIDTH);
  });

  it('can scroll years into the past and future, and Today comes back', async () => {
    const { user, container } = setup();
    act(() => scroller().scrollTo({ left: 0 }));
    expect(container.textContent).toMatch(/October 2016/);

    act(() => scroller().scrollTo({ left: createScale('daily', '2026-11-04').totalWidth - 1024 }));
    expect(container.textContent).toMatch(/2036/);

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(scroller().scrollLeft).toBe(
      columnOfDate(createScale('daily', '2026-11-04'), '2026-11-04') * DAY_WIDTH,
    );
    expect(todayHeader(container)).toHaveTextContent('Wed 4');
  });
});

describe('days label', () => {
  it('shows each dated task’s weekdays in its priority’s text colour', () => {
    setup({
      tasks: [
        { id: 'P', name: 'Website' },
        {
          id: 'A',
          name: 'Design',
          parent: 'P',
          start: '2026-11-05',
          finish: '2026-11-10',
          priority: 'urgent',
        },
        { id: 'B', name: 'Someday' },
      ],
    });
    const list = screen.getByRole('list', { name: 'Tasks' });
    const row = (name: string) =>
      within(list)
        .getAllByRole('listitem')
        .find((li) => li.textContent?.startsWith(name))!;
    const days = within(row('Design')).getByText('(4D)'); // Thu–Tue across a weekend
    expect(days.parentElement!.style.color).toBe('var(--color-priority-urgent-text)');
    expect(within(row('Website')).getByText('(4D)')).toBeInTheDocument(); // parent spans it
    expect(row('Someday').textContent).not.toMatch(/\(\d+D\)/);
  });
});

describe('milestones on the timeline', () => {
  const spec: Spec = {
    milestones: [
      { name: 'Design sign-off', date: '2026-11-06' },
      { name: 'Board review', date: '2026-11-06' },
      { name: 'Weekend thing', date: '2026-11-07' }, // can't be shown
    ],
  };

  it('highlights milestone days with a named marker', () => {
    setup(spec);
    const daily = createScale('daily', '2026-11-04');
    const days = screen.getAllByTestId('milestone-day');
    expect(days).toHaveLength(1); // both share Fri 6; the Saturday one is skipped
    expect(days[0]).toHaveStyle({
      left: `${columnOfDate(daily, '2026-11-06') * DAY_WIDTH}px`,
      width: `${DAY_WIDTH}px`,
    });
    expect(
      screen.getByRole('img', {
        name: 'Milestones: Design sign-off, Board review — Fri 6 Nov 2026',
      }),
    ).toBeInTheDocument();
  });

  it('highlights only the milestone’s day within the week in weekly view', async () => {
    const { user } = setup(spec);
    await user.click(screen.getByText('Weekly'));
    expect(parseFloat(screen.getByTestId('milestone-day').style.width)).toBeCloseTo(WEEK_WIDTH / 5);
  });
});

describe('critical path', () => {
  const spec: Spec = {
    tasks: [
      { id: 'A', name: 'Design', start: '2026-11-02', finish: '2026-11-04' },
      { id: 'B', name: 'Build', start: '2026-11-05', finish: '2026-11-06', deps: [{ from: 'A' }] },
      { id: 'C', name: 'Docs', start: '2026-11-02', finish: '2026-11-03' },
    ],
  };

  it('toggles red lines on the critical tasks and stays up to date', async () => {
    const { user } = setup(spec);
    const toggle = screen.getByRole('button', { name: 'Critical path' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(within(timeline()).queryAllByRole('button', { name: /Critical$/ })).toHaveLength(0);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2 critical tasks')).toBeInTheDocument();
    expect(bar(/^Design:.*Critical$/)).toHaveAttribute('data-critical', 'true');
    expect(bar(/^Build:.*Critical$/)).toBeInTheDocument();
    expect(bar(/^Docs:/)).not.toHaveAttribute('data-critical');

    // Pushing Docs to the last day makes it critical too — recalculated without clicking again.
    act(() =>
      useProjectStore.getState().dispatch(updateTask('C', { name: 'Docs', start: '2026-11-06' })),
    );
    expect(bar(/^Docs:.*Critical$/)).toBeInTheDocument();
    expect(screen.getByText('3 critical tasks')).toBeInTheDocument();

    await user.click(toggle);
    expect(within(timeline()).queryAllByRole('button', { name: /Critical$/ })).toHaveLength(0);
  });
});
