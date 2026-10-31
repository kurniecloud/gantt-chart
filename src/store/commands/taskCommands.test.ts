import { beforeEach, describe, expect, it } from 'vitest';
import { makeProject } from '../../test/fixtures';
import { useProjectStore } from '../projectStore';
import { addTask, deleteTask, moveTask, shiftTaskDates, updateTask } from './taskCommands';

const store = useProjectStore;
const state = () => store.getState();
const project = () => store.getState().project;

// A
// ├─ A1
// │  └─ A1a
// └─ A2
// B
beforeEach(() => {
  state().loadProject(
    makeProject({
      tasks: [
        { id: 'A', start: '2026-11-02', finish: '2026-11-06' },
        { id: 'A1', parent: 'A' },
        { id: 'A1a', parent: 'A1', deps: [{ from: 'B' }] },
        { id: 'A2', parent: 'A', collapsed: true },
        { id: 'B', priority: 'high' },
      ],
    }),
  );
});

describe('addTask', () => {
  it('appends a top-level task with only the fields given', () => {
    state().dispatch(addTask({ name: 'Launch' }, null, 'N'));
    expect(project().taskOrder.at(-1)).toBe('N');
    expect(project().tasks.N).toEqual({
      id: 'N',
      parentId: null,
      name: 'Launch',
      mode: 'manual',
      percentComplete: 0,
    });
    expect(state().past.at(-1)?.label).toBe('Add task');
  });

  it('stores dates and priority when given', () => {
    state().dispatch(
      addTask(
        { name: 'Build', start: '2026-11-09', finish: '2026-11-13', priority: 'urgent' },
        null,
        'N',
      ),
    );
    expect(project().tasks.N).toMatchObject({
      start: '2026-11-09',
      finish: '2026-11-13',
      priority: 'urgent',
    });
  });

  it.each([
    ['A', ['A', 'A1', 'A1a', 'A2', 'N', 'B']], // after A's last descendant
    ['A1', ['A', 'A1', 'A1a', 'N', 'A2', 'B']],
    ['A1a', ['A', 'A1', 'A1a', 'N', 'A2', 'B']], // first subtask of a leaf
    ['B', ['A', 'A1', 'A1a', 'A2', 'B', 'N']],
  ])('adds a subtask of %s as its last child', (parentId, order) => {
    state().dispatch(addTask({ name: 'New' }, parentId, 'N'));
    expect(project().taskOrder).toEqual(order);
    expect(project().tasks.N?.parentId).toBe(parentId);
    expect(state().past.at(-1)?.label).toBe('Add subtask');
  });

  it('expands a collapsed parent so the new subtask is visible', () => {
    state().dispatch(addTask({ name: 'New' }, 'A2', 'N'));
    expect(project().tasks.A2).not.toHaveProperty('collapsed');
  });

  it('does nothing when the parent no longer exists', () => {
    state().dispatch(addTask({ name: 'New' }, 'missing', 'N'));
    expect(state().past).toHaveLength(0);
  });

  it('is undone in one step', () => {
    const before = structuredClone(project());
    state().dispatch(addTask({ name: 'New' }, 'A2', 'N'));
    state().undo();
    expect(project()).toEqual(before);
  });
});

describe('updateTask', () => {
  it('replaces name, dates and priority, clearing fields that are left out', () => {
    state().dispatch(updateTask('A', { name: 'Design', finish: '2026-11-13', priority: 'low' }));
    expect(project().tasks.A).toMatchObject({
      name: 'Design',
      finish: '2026-11-13',
      priority: 'low',
    });
    expect(project().tasks.A).not.toHaveProperty('start');

    state().dispatch(updateTask('B', { name: 'B' }));
    expect(project().tasks.B).not.toHaveProperty('priority');
  });

  it('is undoable and ignores unknown tasks', () => {
    const before = structuredClone(project());
    state().dispatch(updateTask('A', { name: 'Design' }));
    state().undo();
    expect(project()).toEqual(before);

    state().dispatch(updateTask('missing', { name: 'X' }));
    expect(state().past).toHaveLength(0);
  });
});

describe('deleteTask', () => {
  it('removes the task and every subtask below it', () => {
    state().dispatch(deleteTask('A'));
    expect(project().taskOrder).toEqual(['B']);
    expect(Object.keys(project().tasks)).toEqual(['B']);
  });

  it('removes only the chosen branch', () => {
    state().dispatch(deleteTask('A1'));
    expect(project().taskOrder).toEqual(['A', 'A2', 'B']);
  });

  it('removes dependencies that point at deleted tasks', () => {
    expect(Object.keys(project().dependencies)).toHaveLength(1);
    state().dispatch(deleteTask('A1'));
    expect(project().dependencies).toEqual({});
  });

  it('restores the whole subtree with a single undo', () => {
    const before = structuredClone(project());
    state().dispatch(deleteTask('A'));
    state().undo();
    expect(project()).toEqual(before);
    state().redo();
    expect(project().taskOrder).toEqual(['B']);
  });
});

describe('dependencies', () => {
  const deps = () =>
    Object.values(project().dependencies)
      .map((d) => `${d.predecessorId}->${d.successorId}`)
      .sort();

  it('adds a task that depends on others', () => {
    state().dispatch(addTask({ name: 'Launch' }, null, 'N', { blockedBy: ['A2', 'B'] }));
    expect(deps()).toEqual(['A2->N', 'B->A1a', 'B->N']);
    expect(
      Object.values(project().dependencies).every((d) => d.type === 'FS' && d.lagDays === 0),
    ).toBe(true);
  });

  it('replaces what a task depends on, keeping unchanged links', () => {
    const kept = Object.keys(project().dependencies)[0];
    state().dispatch(updateTask('A1a', { name: 'A1a' }, { blockedBy: ['B', 'A2'] }));
    expect(deps()).toEqual(['A2->A1a', 'B->A1a']);
    expect(project().dependencies[kept!]).toBeDefined();

    state().dispatch(updateTask('A1a', { name: 'A1a' }, { blockedBy: [] }));
    expect(deps()).toEqual([]);
  });

  it('leaves dependencies alone when none are given, and undoes in one step', () => {
    const before = structuredClone(project());
    state().dispatch(updateTask('A1a', { name: 'Renamed' }));
    expect(deps()).toEqual(['B->A1a']);
    state().dispatch(updateTask('A1a', { name: 'Renamed' }, { blockedBy: ['A2'] }));
    state().undo();
    state().undo();
    expect(project()).toEqual(before);
  });
});

describe('blocking links', () => {
  const deps = () =>
    Object.values(project().dependencies)
      .map((d) => `${d.predecessorId}->${d.successorId}`)
      .sort();

  it('sets the tasks a task is blocking, alongside what blocks it', () => {
    state().dispatch(
      updateTask('B', { name: 'B' }, { blockedBy: ['A2'], blocking: ['A1', 'A1a'] }),
    );
    // B already blocked A1a; that link is kept, A1 is added.
    expect(deps()).toEqual(['A2->B', 'B->A1', 'B->A1a']);
    state().dispatch(updateTask('B', { name: 'B' }, { blocking: [] }));
    expect(deps()).toEqual(['A2->B']);
  });

  it('adds a new task that blocks others', () => {
    state().dispatch(addTask({ name: 'Prep' }, null, 'N', { blocking: ['A'] }));
    expect(deps()).toContain('N->A');
  });
});

describe('moveTask', () => {
  it('moves a subtree in one undoable step and expands the new parent', () => {
    const before = structuredClone(project());
    state().dispatch(moveTask('A1', { kind: 'last-child', targetId: 'A2' }));
    expect(project().taskOrder).toEqual(['A', 'A2', 'A1', 'A1a', 'B']);
    expect(project().tasks.A1?.parentId).toBe('A2');
    expect(project().tasks.A2).not.toHaveProperty('collapsed'); // was collapsed
    state().undo();
    expect(project()).toEqual(before);
  });

  it('does nothing (and records nothing) for refused or no-op moves', () => {
    state().dispatch(moveTask('A', { kind: 'last-child', targetId: 'A1a' }));
    state().dispatch(moveTask('B', { kind: 'end' })); // already last
    expect(state().past).toHaveLength(0);
  });
});

describe('shiftTaskDates', () => {
  beforeEach(() => {
    state().loadProject(
      makeProject({ tasks: [{ id: 'A', start: '2026-11-02', finish: '2026-11-06' }] }),
    );
  });

  it('moves a task by weekdays, keeping its length, in one undoable step', () => {
    state().dispatch(shiftTaskDates('A', 'move', 2)); // Mon 2–Fri 6 → Wed 4–Tue 10
    expect(project().tasks.A).toMatchObject({ start: '2026-11-04', finish: '2026-11-10' });
    state().undo();
    expect(project().tasks.A).toMatchObject({ start: '2026-11-02', finish: '2026-11-06' });
  });

  it('resizes from either end', () => {
    state().dispatch(shiftTaskDates('A', 'end', -2));
    expect(project().tasks.A).toMatchObject({ start: '2026-11-02', finish: '2026-11-04' });
    state().dispatch(shiftTaskDates('A', 'start', 1));
    expect(project().tasks.A).toMatchObject({ start: '2026-11-03', finish: '2026-11-04' });
  });

  it('keeps a start-only task start-only when moved, and fills in the end when resized', () => {
    state().loadProject(makeProject({ tasks: [{ id: 'S', start: '2026-11-02' }] }));
    state().dispatch(shiftTaskDates('S', 'move', 1));
    expect(project().tasks.S).toEqual(expect.objectContaining({ start: '2026-11-03' }));
    expect(project().tasks.S).not.toHaveProperty('finish');
    state().dispatch(shiftTaskDates('S', 'end', 2));
    expect(project().tasks.S).toMatchObject({ start: '2026-11-03', finish: '2026-11-05' });
  });

  it('leaves parents, undated tasks and zero moves alone', () => {
    state().loadProject(
      makeProject({
        tasks: [
          { id: 'P', start: '2026-11-02' },
          { id: 'C', parent: 'P', start: '2026-11-03' },
          { id: 'U' },
        ],
      }),
    );
    state().dispatch(shiftTaskDates('P', 'move', 3));
    state().dispatch(shiftTaskDates('U', 'move', 3));
    state().dispatch(shiftTaskDates('C', 'move', 0));
    expect(state().past).toHaveLength(0);
  });
});
