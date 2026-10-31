import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';
import { makeProject } from './test/fixtures';

type Spec = Parameters<typeof makeProject>[0];

function setup(spec: Spec = {}) {
  useProjectStore.getState().loadProject(makeProject(spec));
  useUiStore.getState().closeDialog();
  const user = userEvent.setup();
  render(<App storageAvailable />);
  return user;
}

const taskList = () => screen.getByRole('list', { name: 'Tasks' });
const taskNames = () =>
  within(taskList())
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('[data-task-name]')?.textContent)
    .filter(Boolean);
const rowOf = (name: string) =>
  within(taskList())
    .getAllByRole('listitem')
    .find((li) => li.querySelector('[data-task-name]')?.textContent === name)!;
const dialog = () => screen.getByRole('dialog');

describe('first view', () => {
  it('shows the project title, an empty task list and the add row', () => {
    setup({ name: 'Untitled project' });
    expect(screen.getByRole('textbox', { name: 'Project title' })).toHaveValue('Untitled project');
    expect(screen.getByRole('textbox', { name: 'Project description' })).toHaveValue('');
    expect(screen.getByText('Task name')).toBeInTheDocument();
    expect(taskNames()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument();
  });

  it('warns when browser storage is unavailable', () => {
    useProjectStore.getState().loadProject(makeProject());
    render(<App storageAvailable={false} />);
    expect(screen.getByText(/won’t be saved/)).toHaveAttribute('role', 'status');
  });
});

describe('project header', () => {
  it('edits the title on Enter and refuses a blank title', async () => {
    const user = setup();
    const title = () => screen.getByRole('textbox', { name: 'Project title' });
    await user.clear(title());
    await user.type(title(), 'Website relaunch{Enter}');
    expect(useProjectStore.getState().project.name).toBe('Website relaunch');

    await user.clear(title());
    await user.tab();
    expect(title()).toHaveValue('Website relaunch');
  });

  it('edits the description; Shift+Enter adds a line and Enter saves', async () => {
    const user = setup();
    const description = () => screen.getByRole('textbox', { name: 'Project description' });
    await user.click(description());
    await user.type(description(), 'Line one{Shift>}{Enter}{/Shift}Line two{Enter}');
    expect(useProjectStore.getState().project.description).toBe('Line one\nLine two');
    expect(description()).not.toHaveFocus();
  });

  it('undoes and redoes header edits with the icon buttons', async () => {
    const user = setup();
    const title = () => screen.getByRole('textbox', { name: 'Project title' });
    await user.clear(title());
    await user.type(title(), 'Renamed{Enter}');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(title()).toHaveValue('Test project');
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(title()).toHaveValue('Renamed');
  });
});

describe('adding tasks', () => {
  it('requires a name, then adds the task above the add row', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(dialog()).toHaveAccessibleName('Add task');
    expect(within(dialog()).getByRole('textbox', { name: 'Task name' })).toHaveFocus();

    await user.click(within(dialog()).getByRole('button', { name: 'Add' }));
    expect(within(dialog()).getByText('Enter a task name')).toBeInTheDocument();

    await user.type(within(dialog()).getByRole('textbox', { name: 'Task name' }), 'Design');
    await user.click(within(dialog()).getByRole('button', { name: 'Add' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(taskNames()).toEqual(['Design']);
    expect(within(taskList()).getAllByRole('listitem').at(-1)).toContainElement(
      screen.getByRole('button', { name: 'Add task' }),
    );
  });

  it('adds subtasks three levels deep, each indented one level further', async () => {
    const user = setup({
      tasks: [
        { id: 'A', name: 'Website' },
        { id: 'B', name: 'Launch' },
      ],
    });

    const addSubtask = async (parent: string, name: string) => {
      await user.click(screen.getByRole('button', { name: `Add subtask to ${parent}` }));
      expect(dialog()).toHaveAccessibleName(`Add subtask to “${parent}”`);
      await user.type(
        within(dialog()).getByRole('textbox', { name: 'Task name' }),
        `${name}{Enter}`,
      );
    };
    await addSubtask('Website', 'Design');
    await addSubtask('Design', 'Wireframes');
    await addSubtask('Website', 'Build');

    expect(taskNames()).toEqual(['Website', 'Design', 'Wireframes', 'Build', 'Launch']);
    expect(rowOf('Website')).toHaveAttribute('aria-level', '1');
    expect(rowOf('Design')).toHaveAttribute('aria-level', '2');
    expect(rowOf('Wireframes')).toHaveAttribute('aria-level', '3');
    expect(rowOf('Build')).toHaveAttribute('aria-level', '2');
  });

  it('closes on Cancel or Esc without adding anything', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await user.type(within(dialog()).getByRole('textbox', { name: 'Task name' }), 'Draft');
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(taskNames()).toEqual([]);
  });

  it('saves dates picked from the calendar and the chosen priority', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await user.type(within(dialog()).getByRole('textbox', { name: 'Task name' }), 'Build');
    await user.click(within(dialog()).getByRole('radio', { name: 'High' }));
    await user.click(within(dialog()).getByRole('button', { name: /^Planned Start date/ }));
    expect(within(dialog()).getByRole('grid')).toBeInTheDocument();
    await user.keyboard('{Escape}'); // closes the calendar, not the dialog
    expect(dialog()).toBeInTheDocument();
    expect(within(dialog()).queryByRole('grid')).not.toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Add' }));

    expect(
      useProjectStore.getState().project.tasks[useProjectStore.getState().project.taskOrder[0]!],
    ).toMatchObject({ name: 'Build', priority: 'high' });
  });
});

describe('date pickers', () => {
  const editDated = async () => {
    const user = setup({ tasks: [{ id: 'A', name: 'Build', start: '2026-11-04' }] }); // Wed
    await user.click(screen.getByRole('button', { name: 'Build' }));
    return user;
  };

  it('greys out weekends', async () => {
    const user = await editDated();
    await user.click(within(dialog()).getByRole('button', { name: /^Planned Start date/ }));
    const day = (label: RegExp) => within(dialog()).getByRole('button', { name: label });
    expect(day(/Saturday, November 7th, 2026/)).toBeDisabled();
    expect(day(/Sunday, November 8th, 2026/)).toBeDisabled();
    expect(day(/Friday, November 6th, 2026/)).toBeEnabled();
  });

  it('greys out end dates before the start date', async () => {
    const user = await editDated();
    await user.click(within(dialog()).getByRole('button', { name: /^Planned End date/ }));
    const day = (label: RegExp) => within(dialog()).getByRole('button', { name: label });
    expect(day(/Tuesday, November 3rd, 2026/)).toBeDisabled();
    expect(day(/Wednesday, November 4th, 2026/)).toBeEnabled();
  });

  it('picks and clears dates', async () => {
    const user = await editDated();
    await user.click(within(dialog()).getByRole('button', { name: /^Planned End date/ }));
    await user.click(within(dialog()).getByRole('button', { name: /Friday, November 13th, 2026/ }));
    expect(within(dialog()).getByRole('button', { name: /^Planned End date/ })).toHaveTextContent(
      'Fri 13 Nov 2026',
    );
    await user.click(within(dialog()).getByRole('button', { name: 'Clear planned start date' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    const task = useProjectStore.getState().project.tasks.A;
    expect(task).toMatchObject({ finish: '2026-11-13' });
    expect(task).not.toHaveProperty('start');
  });
});

describe('editing tasks', () => {
  it('opens the edit dialog from the row or the name, prefilled', async () => {
    const user = setup({
      tasks: [{ id: 'A', name: 'Design', start: '2026-11-02', priority: 'urgent' }],
    });
    await user.click(rowOf('Design'));
    expect(dialog()).toHaveAccessibleName('Edit task');
    expect(within(dialog()).getByRole('textbox', { name: 'Task name' })).toHaveValue('Design');
    expect(within(dialog()).getByRole('button', { name: /^Planned Start date/ })).toHaveTextContent(
      'Mon 2 Nov 2026',
    );
    expect(within(dialog()).getByRole('radio', { name: 'Urgent' })).toBeChecked();

    const name = within(dialog()).getByRole('textbox', { name: 'Task name' });
    await user.clear(name);
    await user.type(name, 'UI design');
    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(taskNames()).toEqual(['UI design']);
  });

  it('shows a parent’s dates as calculated from its subtasks', async () => {
    const user = setup({
      tasks: [
        { id: 'P', name: 'Website' },
        { id: 'C', name: 'Design', parent: 'P', start: '2026-11-02', finish: '2026-11-13' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Website' }));
    expect(dialog()).toHaveTextContent('Mon 2 Nov 2026 – Fri 13 Nov 2026');
    expect(dialog()).toHaveTextContent('Calculated from subtasks');
    expect(
      within(dialog()).queryByRole('button', { name: /^Planned Start date/ }),
    ).not.toBeInTheDocument();
  });
});

describe('deleting tasks', () => {
  it('warns that subtasks go too, deletes the subtree, and undo brings it back', async () => {
    const user = setup({
      tasks: [
        { id: 'P', name: 'Website' },
        { id: 'C', name: 'Design', parent: 'P' },
        { id: 'G', name: 'Wireframes', parent: 'C' },
        { id: 'B', name: 'Launch' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Delete Website' }));
    expect(dialog()).toHaveAccessibleName('Delete “Website”?');
    expect(dialog()).toHaveTextContent('All subtasks will be deleted.');
    expect(dialog()).toHaveTextContent('2 subtasks will be removed with it.');
    expect(within(dialog()).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(within(dialog()).getByRole('button', { name: 'Delete' }));
    expect(taskNames()).toEqual(['Launch']);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(taskNames()).toEqual(['Website', 'Design', 'Wireframes', 'Launch']);
  });

  it('uses simpler wording for a task without subtasks, and Cancel keeps it', async () => {
    const user = setup({ tasks: [{ id: 'A', name: 'Launch' }] });
    await user.click(screen.getByRole('button', { name: 'Delete Launch' }));
    expect(dialog()).toHaveTextContent('This task will be deleted.');
    expect(dialog()).not.toHaveTextContent('subtasks');
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(taskNames()).toEqual(['Launch']);
  });
});

describe('expand / collapse', () => {
  const tree: Spec = {
    tasks: [
      { id: 'P', name: 'Website' },
      { id: 'C', name: 'Design', parent: 'P' },
      { id: 'G', name: 'Wireframes', parent: 'C' },
      { id: 'B', name: 'Launch' },
    ],
  };

  it('shows a toggle only on tasks with subtasks, and hides/shows them', async () => {
    const user = setup(tree);
    expect(within(rowOf('Launch')).queryByRole('button', { name: /Collapse|Expand/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Collapse Website' }));
    expect(taskNames()).toEqual(['Website', 'Launch']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // toggle doesn't open edit

    await user.click(screen.getByRole('button', { name: 'Expand Website' }));
    expect(taskNames()).toEqual(['Website', 'Design', 'Wireframes', 'Launch']);
    expect(useProjectStore.getState().past).toHaveLength(0); // not an undoable edit
  });

  it('supports arrow keys on task names', async () => {
    const user = setup(tree);
    screen.getByRole('button', { name: 'Website' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Design' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}'); // collapse Design
    expect(taskNames()).toEqual(['Website', 'Design', 'Launch']);
    await user.keyboard('{ArrowLeft}'); // already collapsed → go to parent
    expect(screen.getByRole('button', { name: 'Website' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Add task' })).toHaveFocus();
  });
});

describe('blocking links', () => {
  const links = () =>
    Object.values(useProjectStore.getState().project.dependencies)
      .map((d) => {
        const tasks = useProjectStore.getState().project.tasks;
        return `${tasks[d.predecessorId]!.name} → ${tasks[d.successorId]!.name}`;
      })
      .sort();
  const field = (label: string) => within(dialog()).getByRole('combobox', { name: label });
  const chips = (label: string) =>
    within(within(dialog()).getByRole('list', { name: `${label} (chosen)` }))
      .getAllByRole('listitem')
      .map((li) => li.textContent);

  it('sets what a new task is blocked by and what it is blocking', async () => {
    const user = setup({
      tasks: [
        { id: 'A', name: 'Design' },
        { id: 'B', name: 'Build' },
        { id: 'C', name: 'Launch' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await user.type(within(dialog()).getByRole('textbox', { name: 'Task name' }), 'Review');
    await user.selectOptions(field('Is blocked by'), 'Design');
    await user.selectOptions(field('Is blocked by'), 'Build');
    await user.click(
      within(dialog()).getByRole('button', { name: 'Remove Build from “Is blocked by”' }),
    );
    await user.selectOptions(field('Is blocking'), 'Launch');
    expect(chips('Is blocked by')).toEqual(['Design']);
    expect(chips('Is blocking')).toEqual(['Launch']);
    await user.click(within(dialog()).getByRole('button', { name: 'Add' }));

    expect(links()).toEqual(['Design → Review', 'Review → Launch']);
  });

  it('shows both directions when editing, and never offers a loop', async () => {
    const user = setup({
      tasks: [
        { id: 'A', name: 'Design' },
        { id: 'B', name: 'Build', deps: [{ from: 'A' }] },
        { id: 'C', name: 'Launch', deps: [{ from: 'B' }] },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Build' }));
    expect(chips('Is blocked by')).toEqual(['Design']);
    expect(chips('Is blocking')).toEqual(['Launch']);

    // Design is upstream and Launch downstream: neither may appear on the other side.
    const options = (label: string) =>
      within(field(label))
        .getAllByRole('option')
        .map((o) => o.textContent);
    expect(options('Is blocked by')).toEqual(['No tasks to choose from']);
    expect(options('Is blocking')).toEqual(['No tasks to choose from']);

    // Dropping the link to Launch frees it up for the other side — and vice versa.
    await user.click(
      within(dialog()).getByRole('button', { name: 'Remove Launch from “Is blocking”' }),
    );
    expect(options('Is blocked by')).toContain('Launch');
    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(links()).toEqual(['Design → Build']);
  });
});

describe('planned vs actual dates', () => {
  it('shows Planned and Actual boxes; an actual date fills an empty planned one', async () => {
    const user = setup({ tasks: [{ id: 'A', name: 'Build', start: '2026-11-04' }] }); // Wed
    await user.click(screen.getByRole('button', { name: 'Build' }));
    expect(within(dialog()).getByRole('group', { name: 'Planned' })).toBeInTheDocument();
    expect(within(dialog()).getByRole('group', { name: 'Actual' })).toBeInTheDocument();

    // Planned end is empty: picking an actual end fills it; the planned start stays as it was.
    await user.click(within(dialog()).getByRole('button', { name: /^Actual Start date/ }));
    await user.click(
      within(dialog()).getByRole('button', { name: /Thursday, November 5th, 2026/ }),
    );
    await user.click(within(dialog()).getByRole('button', { name: /^Actual End date/ }));
    await user.click(within(dialog()).getByRole('button', { name: /Monday, November 9th, 2026/ }));
    expect(within(dialog()).getByRole('button', { name: /^Planned Start date/ })).toHaveTextContent(
      'Wed 4 Nov 2026',
    );
    expect(within(dialog()).getByRole('button', { name: /^Planned End date/ })).toHaveTextContent(
      'Mon 9 Nov 2026',
    );

    await user.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(useProjectStore.getState().project.tasks.A).toMatchObject({
      start: '2026-11-04',
      finish: '2026-11-09',
      actualStart: '2026-11-05',
      actualFinish: '2026-11-09',
    });
  });

  it('shows a parent’s actual dates as calculated from its subtasks', async () => {
    const user = setup({
      tasks: [
        { id: 'P', name: 'Website' },
        {
          id: 'C',
          name: 'Design',
          parent: 'P',
          start: '2026-11-02',
          actualStart: '2026-11-03',
          actualFinish: '2026-11-06',
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Website' }));
    const actual = within(dialog()).getByRole('group', { name: 'Actual' });
    expect(actual).toHaveTextContent('Tue 3 Nov 2026 – Fri 6 Nov 2026');
    expect(actual).toHaveTextContent('Calculated from subtasks');
  });
});
