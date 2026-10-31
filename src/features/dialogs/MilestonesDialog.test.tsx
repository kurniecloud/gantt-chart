import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { makeProject } from '../../test/fixtures';

type Spec = Parameters<typeof makeProject>[0];

function setup(spec: Spec = {}) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0)); // Wed 4 Nov 2026
  useProjectStore.getState().loadProject(makeProject(spec));
  useUiStore.getState().closeDialog();
  const user = userEvent.setup();
  render(<App storageAvailable />);
  return user;
}

afterEach(() => vi.useRealTimers());

const dialog = () => screen.getByRole('dialog', { name: 'Milestones' });
const milestones = () => useProjectStore.getState().project.milestones;

describe('milestones dialog', () => {
  it('opens from the button above “Task name” with an empty table', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    expect(
      within(dialog()).getByRole('columnheader', { name: 'Milestone name' }),
    ).toBeInTheDocument();
    expect(
      within(dialog()).getByRole('columnheader', { name: 'Milestone date' }),
    ).toBeInTheDocument();
    expect(dialog()).toHaveTextContent('No milestones yet.');
    expect(within(dialog()).getByRole('button', { name: 'Add milestone' })).toHaveFocus();
  });

  it('adds milestones, refusing missing names and dates, and saves them sorted by date', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Milestones' }));

    await user.click(within(dialog()).getByRole('button', { name: 'Add milestone' }));
    const first = within(dialog()).getByRole('textbox', { name: 'Milestone name, row 1' });
    expect(first).toHaveFocus();
    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(dialog()).toHaveTextContent('Enter a name');
    expect(dialog()).toHaveTextContent('Pick a date');

    await user.type(first, 'Launch');
    await user.click(within(dialog()).getByRole('button', { name: /^Date for Launch/ }));
    await user.click(within(dialog()).getByRole('button', { name: /Friday, November 20th, 2026/ }));

    await user.click(within(dialog()).getByRole('button', { name: 'Add milestone' }));
    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Milestone name, row 2' }),
      'Kick-off',
    );
    await user.click(within(dialog()).getByRole('button', { name: /^Date for Kick-off/ }));
    expect(
      within(dialog()).getByRole('button', { name: /Saturday, November 7th, 2026/ }),
    ).toBeDisabled();
    await user.click(within(dialog()).getByRole('button', { name: /Monday, November 2nd, 2026/ }));

    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(milestones().map((m) => [m.name, m.date])).toEqual([
      ['Kick-off', '2026-11-02'],
      ['Launch', '2026-11-20'],
    ]);
  });

  it('edits and deletes existing milestones as one undoable change', async () => {
    const user = setup({
      milestones: [
        { name: 'Kick-off', date: '2026-11-02' },
        { name: 'Launch', date: '2026-11-20' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    const name = within(dialog()).getByRole('textbox', { name: 'Milestone name, row 2' });
    await user.clear(name);
    await user.type(name, 'Go live');
    await user.click(within(dialog()).getByRole('button', { name: 'Delete milestone Kick-off' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(milestones().map((m) => m.name)).toEqual(['Go live']);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(milestones().map((m) => m.name)).toEqual(['Kick-off', 'Launch']);
  });

  it('discards changes on Cancel', async () => {
    const user = setup({ milestones: [{ name: 'Launch', date: '2026-11-20' }] });
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Delete milestone Launch' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(milestones().map((m) => m.name)).toEqual(['Launch']);
    expect(useProjectStore.getState().past).toHaveLength(0);
  });
});
