import { beforeEach, describe, expect, it } from 'vitest';
import { makeProject } from '../../test/fixtures';
import { useProjectStore } from '../projectStore';
import { clearProject } from './projectCommands';

const full = () =>
  makeProject({
    name: 'Old plan',
    description: 'To be cleared',
    start: '2026-11-02',
    tasks: [
      { id: 'A', name: 'Design', start: '2026-11-02', finish: '2026-11-06' },
      { id: 'B', name: 'Build', deps: [{ from: 'A' }] },
    ],
    milestones: [{ name: 'Sign-off', date: '2026-11-13' }],
  });

describe('clearProject', () => {
  beforeEach(() => useProjectStore.getState().loadProject(full()));

  it('leaves what a first launch creates, under the same id', () => {
    const { id, schemaVersion, defaultCalendarId } = useProjectStore.getState().project;
    useProjectStore.getState().dispatch(clearProject('2026-11-09'));
    const { project } = useProjectStore.getState();
    expect(project).toMatchObject({
      id,
      schemaVersion,
      defaultCalendarId,
      name: 'Untitled Project',
      description: '',
      startDate: '2026-11-09',
      tasks: {},
      taskOrder: [],
      dependencies: {},
      milestones: [],
    });
    expect(Object.keys(project.calendars)).toEqual([defaultCalendarId]);
  });

  it('is one undo step, and redo clears again', () => {
    const before = structuredClone(useProjectStore.getState().project);
    const { dispatch, undo, redo } = useProjectStore.getState();
    dispatch(clearProject('2026-11-09'));
    expect(useProjectStore.getState().past.at(-1)?.label).toBe('New Project');

    undo();
    expect(useProjectStore.getState().project).toEqual(before);

    redo();
    expect(useProjectStore.getState().project.taskOrder).toEqual([]);
  });
});
