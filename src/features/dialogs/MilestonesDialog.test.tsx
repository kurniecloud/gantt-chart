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
/** The names in the dialog's rows, top to bottom. */
const rowNames = () =>
  within(dialog())
    .getAllByRole('textbox')
    .map((box) => (box as HTMLInputElement).value);
const rowOf = (name: string) =>
  within(dialog()).getByDisplayValue(name).closest('tr') as HTMLTableRowElement;
const dateOf = (name: string) =>
  within(dialog()).getByRole('button', { name: new RegExp(`^Date for ${name}`) });
const flashing = () =>
  within(dialog())
    .getAllByRole('row')
    .filter((row) => /moved/.test(row.className));

describe('milestones dialog', () => {
  it('opens from the button above “Task Name” with an empty table', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    expect(
      within(dialog()).getByRole('columnheader', { name: 'Milestone Name' }),
    ).toBeInTheDocument();
    expect(
      within(dialog()).getByRole('columnheader', { name: 'Milestone Date' }),
    ).toBeInTheDocument();
    expect(dialog()).toHaveTextContent('No milestones yet.');
    expect(within(dialog()).getByRole('button', { name: 'Add Milestone' })).toHaveFocus();
  });

  it('adds milestones, refusing missing names and dates, and saves them sorted by date', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Milestones' }));

    await user.click(within(dialog()).getByRole('button', { name: 'Add Milestone' }));
    const first = within(dialog()).getByRole('textbox', { name: 'Milestone Name, Row 1' });
    expect(first).toHaveFocus();
    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(dialog()).toHaveTextContent('Enter a name');
    expect(dialog()).toHaveTextContent('Pick a date');

    await user.type(first, 'Launch');
    await user.click(within(dialog()).getByRole('button', { name: /^Date for Launch/ }));
    await user.click(within(dialog()).getByRole('button', { name: /Friday, November 20th, 2026/ }));

    await user.click(within(dialog()).getByRole('button', { name: 'Add Milestone' }));
    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Milestone Name, Row 2' }),
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
    const name = within(dialog()).getByRole('textbox', { name: 'Milestone Name, Row 2' });
    await user.clear(name);
    await user.type(name, 'Go live');
    await user.click(within(dialog()).getByRole('button', { name: 'Delete Milestone Kick-off' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(milestones().map((m) => m.name)).toEqual(['Go live']);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(milestones().map((m) => m.name)).toEqual(['Kick-off', 'Launch']);
  });

  it('discards changes on Cancel', async () => {
    const user = setup({ milestones: [{ name: 'Launch', date: '2026-11-20' }] });
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Delete Milestone Launch' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(milestones().map((m) => m.name)).toEqual(['Launch']);
    expect(useProjectStore.getState().past).toHaveLength(0);
  });
});

describe('milestones dialog: date order', () => {
  const twoMilestones: Spec = {
    milestones: [
      { name: 'Kick-off', date: '2026-11-02' },
      { name: 'Launch', date: '2026-11-20' },
    ],
  };

  it('moves a row into date order as soon as its date is picked, and flashes only that row', async () => {
    const user = setup(twoMilestones);
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Add Milestone' }));
    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Milestone Name, Row 3' }),
      'Beta',
    );
    expect(rowNames()).toEqual(['Kick-off', 'Launch', 'Beta']); // typing never moves a row

    await user.click(dateOf('Beta'));
    await user.click(within(dialog()).getByRole('button', { name: /Friday, November 13th, 2026/ }));
    expect(rowNames()).toEqual(['Kick-off', 'Beta', 'Launch']);
    expect(flashing()).toEqual([rowOf('Beta')]);
    expect(scrolled.mock.contexts).toContain(rowOf('Beta'));
    expect(dateOf('Beta')).toHaveFocus(); // focus follows the row
    expect(within(dialog()).getByRole('status')).toHaveTextContent('Beta moved to row 2.');
    scrolled.mockRestore();
  });

  it('does not flash a row whose new date leaves it where it was', async () => {
    const user = setup(twoMilestones);
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    await user.click(dateOf('Launch'));
    await user.click(within(dialog()).getByRole('button', { name: /Friday, November 27th, 2026/ }));
    expect(rowNames()).toEqual(['Kick-off', 'Launch']);
    expect(flashing()).toEqual([]);
    expect(within(dialog()).getByRole('status')).toHaveTextContent('');
  });

  it('moves a row whose date is cleared to the very bottom, below rows still without a date', async () => {
    const user = setup(twoMilestones);
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Add Milestone' }));
    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Milestone Name, Row 3' }),
      'Beta',
    );

    await user.click(within(dialog()).getByRole('button', { name: 'Clear Date for Kick-off' }));
    expect(rowNames()).toEqual(['Launch', 'Beta', 'Kick-off']);
    expect(flashing()).toEqual([rowOf('Kick-off')]);
    expect(dateOf('Kick-off')).toHaveFocus();
    expect(dateOf('Kick-off')).toHaveTextContent('No Date');
    expect(within(dialog()).getByRole('status')).toHaveTextContent('Kick-off moved to row 3.');

    // Dating it again brings it back up, and the flash moves with it.
    await user.click(dateOf('Kick-off'));
    await user.click(within(dialog()).getByRole('button', { name: /Monday, November 2nd, 2026/ }));
    expect(rowNames()).toEqual(['Kick-off', 'Launch', 'Beta']);
    expect(flashing()).toEqual([rowOf('Kick-off')]);
  });

  it('puts a row given a taken date after the others on that day, and Save keeps that order', async () => {
    const user = setup({
      milestones: [
        { name: 'Beta', date: '2026-11-13' },
        { name: 'Launch', date: '2026-11-20' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Add Milestone' }));
    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Milestone Name, Row 3' }),
      'Alpha',
    );
    await user.click(dateOf('Alpha'));
    await user.click(within(dialog()).getByRole('button', { name: /Friday, November 13th, 2026/ }));
    expect(rowNames()).toEqual(['Beta', 'Alpha', 'Launch']);

    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(milestones().map((m) => m.name)).toEqual(['Beta', 'Alpha', 'Launch']);
  });

  it('opens sorted by date, and Save with no edits changes nothing', async () => {
    const user = setup({
      milestones: [
        { name: 'Launch', date: '2026-11-20' }, // as an imported file might list them
        { name: 'Kick-off', date: '2026-11-02' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    expect(rowNames()).toEqual(['Kick-off', 'Launch']);
    expect(flashing()).toEqual([]);

    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(milestones().map((m) => m.name)).toEqual(['Launch', 'Kick-off']);
    expect(useProjectStore.getState().past).toHaveLength(0);
  });

  it('discards the new order on Cancel', async () => {
    const user = setup(twoMilestones);
    await user.click(screen.getByRole('button', { name: 'Milestones' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Clear Date for Kick-off' }));
    expect(rowNames()).toEqual(['Launch', 'Kick-off']);
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(milestones().map((m) => [m.name, m.date])).toEqual([
      ['Kick-off', '2026-11-02'],
      ['Launch', '2026-11-20'],
    ]);
    expect(useProjectStore.getState().past).toHaveLength(0);
  });
});
