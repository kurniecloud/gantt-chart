import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../App';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { makeProject } from '../../test/fixtures';

// jsdom has no layout: the task list sits at y = 0, so a pointer at clientY = y is y px into the
// list, and each row is 36 px tall.
const ROW = 36;

function setup() {
  useProjectStore.getState().loadProject(
    makeProject({
      tasks: [
        { id: 'A', name: 'Planning' },
        { id: 'A1', name: 'Gather', parent: 'A' },
        { id: 'A2', name: 'Write', parent: 'A' },
        { id: 'B', name: 'Build' },
        { id: 'C', name: 'Launch' },
      ],
    }),
  );
  useUiStore.getState().closeDialog();
  const user = userEvent.setup();
  render(<App storageAvailable />);
  return user;
}

const names = () =>
  [...document.querySelectorAll('[data-task-name]')].map(
    (el) => `${el.textContent}@${el.closest('li')!.getAttribute('aria-level')}`,
  );
const project = () => useProjectStore.getState().project;

/** Drags a row by its grip to `y` px into the list (row index × 36 + offset). */
function dragRow(name: string, y: number, { release = true } = {}) {
  const grip = screen.getByRole('button', { name: `Move ${name}` });
  fireEvent.pointerDown(grip, { button: 0, clientX: 5, clientY: 0 });
  fireEvent.pointerMove(window, { clientX: 100, clientY: y });
  if (release) fireEvent.pointerUp(window, { clientX: 100, clientY: y });
}

describe('dragging rows', () => {
  it('drops above a row (top quarter of it)', () => {
    setup();
    dragRow('Launch', 3 * ROW + 4); // top of "Build" (row 3)
    expect(names()).toEqual(['Planning@1', 'Gather@2', 'Write@2', 'Launch@1', 'Build@1']);
  });

  it('drops into a row (middle) as its last subtask, children following', () => {
    setup();
    dragRow('Planning', 4 * ROW + 18); // middle of "Launch" (row 4)
    expect(names()).toEqual(['Build@1', 'Launch@1', 'Planning@2', 'Gather@3', 'Write@3']);
    expect(project().tasks.A?.parentId).toBe('C');
  });

  it('drops below an expanded parent as its first subtask', () => {
    setup();
    dragRow('Launch', 0 * ROW + 32); // bottom of "Planning" (row 0, expanded)
    expect(names()).toEqual(['Planning@1', 'Launch@2', 'Gather@2', 'Write@2', 'Build@1']);
  });

  it('turns a subtask into a top-level task, and drops on the "+" row to move it last', () => {
    setup();
    dragRow('Write', 5 * ROW + 10); // the "+" row
    expect(names()).toEqual(['Planning@1', 'Gather@2', 'Build@1', 'Launch@1', 'Write@1']);
  });

  it('refuses dropping a parent inside its own subtree, saying why', () => {
    setup();
    dragRow('Planning', 1 * ROW + 18, { release: false }); // middle of its child "Gather"
    expect(
      within(screen.getByRole('list', { name: 'Tasks' })).getByRole('status'),
    ).toHaveTextContent('A task can’t be moved inside itself or its own subtasks.');
    fireEvent.pointerUp(window);
    expect(useProjectStore.getState().past).toHaveLength(0);
  });

  it('cancels on Esc', () => {
    setup();
    dragRow('Launch', 18, { release: false });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.pointerUp(window);
    expect(useProjectStore.getState().past).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // grip click didn't open Edit
  });

  it('is one undo step', async () => {
    const user = setup();
    dragRow('Launch', 18);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(names()).toEqual(['Planning@1', 'Gather@2', 'Write@2', 'Build@1', 'Launch@1']);
  });
});

describe('moving rows with the keyboard', () => {
  it('Alt+Shift+arrows move up/down, into the row above, and out a level', async () => {
    const user = setup();
    screen.getByRole('button', { name: 'Launch' }).focus();
    await user.keyboard('{Alt>}{Shift>}{ArrowUp}{/Shift}{/Alt}');
    expect(names()).toEqual(['Planning@1', 'Gather@2', 'Write@2', 'Launch@1', 'Build@1']);
    expect(screen.getByRole('button', { name: 'Launch' })).toHaveFocus();

    await user.keyboard('{Alt>}{Shift>}{ArrowRight}{/Shift}{/Alt}'); // into Planning
    expect(names()).toEqual(['Planning@1', 'Gather@2', 'Write@2', 'Launch@2', 'Build@1']);

    await user.keyboard('{Alt>}{Shift>}{ArrowLeft}{/Shift}{/Alt}'); // back out, after Planning
    expect(names()).toEqual(['Planning@1', 'Gather@2', 'Write@2', 'Launch@1', 'Build@1']);

    await user.keyboard('{Alt>}{Shift>}{ArrowDown}{/Shift}{/Alt}');
    expect(names()).toEqual(['Planning@1', 'Gather@2', 'Write@2', 'Build@1', 'Launch@1']);
  });
});
