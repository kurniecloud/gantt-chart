import { beforeEach, describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { addTask, renameProject } from './commands/projectCommands';
import { HISTORY_LIMIT, useProjectStore } from './projectStore';

const store = useProjectStore;

beforeEach(() => {
  store.getState().loadProject(makeProject({ tasks: [{ id: 'A', duration: 3 }] }));
});

describe('dispatch / undo / redo', () => {
  it('undo restores the exact previous project and redo reapplies it', () => {
    const before = structuredClone(store.getState().project);
    store.getState().dispatch(addTask('Build'));
    const after = structuredClone(store.getState().project);
    expect(after.taskOrder).toHaveLength(2);

    store.getState().undo();
    expect(store.getState().project).toEqual(before);

    store.getState().redo();
    expect(store.getState().project).toEqual(after);
  });

  it('a new command clears the redo stack', () => {
    store.getState().dispatch(renameProject('One'));
    store.getState().undo();
    expect(store.getState().future).toHaveLength(1);
    store.getState().dispatch(renameProject('Two'));
    expect(store.getState().future).toHaveLength(0);
  });

  it('ignores commands that change nothing', () => {
    store.getState().dispatch(renameProject('   '));
    expect(store.getState().past).toHaveLength(0);
  });

  it('keeps at most HISTORY_LIMIT entries', () => {
    for (let i = 0; i <= HISTORY_LIMIT; i++) store.getState().dispatch(renameProject(`Name ${i}`));
    expect(store.getState().past).toHaveLength(HISTORY_LIMIT);
  });

  it('loadProject clears history', () => {
    store.getState().dispatch(renameProject('Changed'));
    store.getState().loadProject(makeProject());
    expect(store.getState().past).toHaveLength(0);
    expect(store.getState().future).toHaveLength(0);
  });

  it('undo and redo are no-ops at the ends of history', () => {
    const project = store.getState().project;
    store.getState().undo();
    store.getState().redo();
    expect(store.getState().project).toBe(project);
  });
});

describe('addTask', () => {
  it('adds a 1-day task on the project start date', () => {
    store.getState().dispatch(addTask());
    const { project } = store.getState();
    const id = project.taskOrder[1]!;
    expect(project.tasks[id]).toMatchObject({
      name: 'New task',
      parentId: null,
      start: '2026-11-02',
      finish: '2026-11-02',
      durationDays: 1,
    });
  });
});
