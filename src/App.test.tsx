import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { useProjectStore } from './store/projectStore';
import { makeProject } from './test/fixtures';

beforeEach(() => {
  useProjectStore.getState().loadProject(
    makeProject({
      tasks: [
        { id: 'P', name: 'Planning', duration: 3 },
        { id: 'A', name: 'Gather requirements', duration: 3, parent: 'P' },
        { id: 'M', name: 'Sign-off', duration: 0, parent: 'P' },
      ],
    }),
  );
});

describe('App', () => {
  it('lists the project’s tasks with dates and durations', () => {
    render(<App storageAvailable />);
    const row = screen.getByRole('row', { name: /Gather requirements/ });
    expect(within(row).getByText('Mon 2 Nov')).toBeInTheDocument();
    expect(within(row).getByText('Wed 4 Nov')).toBeInTheDocument();
    expect(within(row).getByText('3 days')).toBeInTheDocument();
    expect(
      within(screen.getByRole('row', { name: /Sign-off/ })).getByText('Milestone'),
    ).toBeInTheDocument();
  });

  it('adds a task, then undoes and redoes it with buttons and shortcuts', async () => {
    const user = userEvent.setup();
    render(<App storageAvailable />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByRole('row', { name: /New task/ })).toBeInTheDocument();

    await user.click(undo);
    expect(screen.queryByRole('row', { name: /New task/ })).not.toBeInTheDocument();

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(screen.getByRole('row', { name: /New task/ })).toBeInTheDocument();

    await user.keyboard('{Control>}z{/Control}');
    expect(screen.queryByRole('row', { name: /New task/ })).not.toBeInTheDocument();
  });

  it('renames the project on Enter and ignores blank names', async () => {
    const user = userEvent.setup();
    render(<App storageAvailable />);
    // The input remounts when the stored name changes, so look it up again after each rename.
    const nameInput = () => screen.getByRole('textbox', { name: 'Project name' });

    await user.clear(nameInput());
    await user.type(nameInput(), 'Website relaunch{Enter}');
    expect(useProjectStore.getState().project.name).toBe('Website relaunch');

    await user.clear(nameInput());
    await user.tab();
    expect(nameInput()).toHaveValue('Website relaunch');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(nameInput()).toHaveValue('Test project');
  });

  it('warns when browser storage is unavailable', () => {
    render(<App storageAvailable={false} />);
    expect(screen.getByRole('status')).toHaveTextContent(/won’t be saved/);
  });
});
