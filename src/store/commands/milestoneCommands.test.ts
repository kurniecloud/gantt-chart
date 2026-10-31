import { beforeEach, describe, expect, it } from 'vitest';
import { makeProject } from '../../test/fixtures';
import { useProjectStore } from '../projectStore';
import { setMilestones } from './milestoneCommands';
import { importProject } from './projectCommands';

const state = () => useProjectStore.getState();

beforeEach(() => {
  state().loadProject(makeProject({ milestones: [{ name: 'Old', date: '2026-11-02' }] }));
});

describe('setMilestones', () => {
  it('replaces all milestones, sorted by date then name, undoable in one step', () => {
    state().dispatch(
      setMilestones([
        { id: 'b', name: 'Launch', date: '2026-11-20' },
        { id: 'c', name: 'Beta', date: '2026-11-13' },
        { id: 'a', name: 'Alpha', date: '2026-11-13' },
      ]),
    );
    expect(state().project.milestones.map((m) => m.name)).toEqual(['Alpha', 'Beta', 'Launch']);
    state().undo();
    expect(state().project.milestones.map((m) => m.name)).toEqual(['Old']);
  });
});

describe('importProject', () => {
  it('replaces the content but keeps the open project’s id', () => {
    const { id } = state().project;
    const imported = makeProject({ name: 'New', tasks: [{ id: 'T', name: 'Task' }] });
    state().dispatch(importProject(imported));
    expect(state().project).toEqual({ ...imported, id });
  });
});
