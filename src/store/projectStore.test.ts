import { beforeEach, describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { renameProject, setProjectDescription } from './commands/projectCommands';
import { addTask } from './commands/taskCommands';
import { HISTORY_LIMIT, useProjectStore } from './projectStore';

const store = useProjectStore;

beforeEach(() => {
  store.getState().loadProject(makeProject({ tasks: [{ id: 'A' }] }));
});

describe('dispatch / undo / redo', () => {
  it('undo restores the exact previous project and redo reapplies it', () => {
    const before = structuredClone(store.getState().project);
    store.getState().dispatch(addTask({ name: 'Build' }));
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

describe('project commands', () => {
  it('sets a trimmed description, which may be empty', () => {
    store.getState().dispatch(setProjectDescription('  Q4 launch plan \n'));
    expect(store.getState().project.description).toBe('Q4 launch plan');
    store.getState().dispatch(setProjectDescription(''));
    expect(store.getState().project.description).toBe('');
  });
});

describe('setCollapsed', () => {
  beforeEach(() => {
    store.getState().loadProject(makeProject({ tasks: [{ id: 'P' }, { id: 'C', parent: 'P' }] }));
  });

  it('collapses and expands without touching undo history', () => {
    store.getState().setCollapsed('P', true);
    expect(store.getState().project.tasks.P?.collapsed).toBe(true);
    store.getState().setCollapsed('P', false);
    expect(store.getState().project.tasks.P).not.toHaveProperty('collapsed');
    expect(store.getState().past).toHaveLength(0);
  });

  it('keeps undo working across collapse changes', () => {
    store.getState().dispatch(renameProject('Renamed'));
    store.getState().setCollapsed('P', true);
    store.getState().undo();
    expect(store.getState().project.name).toBe('Test project');
    expect(store.getState().project.tasks.P?.collapsed).toBe(true);
  });

  it('ignores unknown tasks', () => {
    const project = store.getState().project;
    store.getState().setCollapsed('missing', true);
    expect(store.getState().project).toBe(project);
  });
});
