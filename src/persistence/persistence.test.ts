import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '../domain/project';
import { renameProject } from '../store/commands/projectCommands';
import { useProjectStore } from '../store/projectStore';
import { makeProject } from '../test/fixtures';
import { loadInitialProject, startAutosave } from './autosave';
import { getLastOpenedId, listProjects, loadProject, saveProject } from './db';
import { migrateProject } from './migrations';

describe('migrateProject', () => {
  it('accepts a current-version project unchanged', () => {
    const project = makeProject({ tasks: [{ id: 'A' }] });
    expect(migrateProject(structuredClone(project))).toEqual(project);
  });

  it.each([
    [null, /not an object/],
    [[], /not an object/],
    [{ name: 'x' }, /schema version/],
    [{ schemaVersion: 0 }, /schema version/],
    [{ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }, /newer version/],
  ])('rejects %j', (raw, message) => {
    expect(() => migrateProject(raw)).toThrow(message);
  });

  it('upgrades a v1 project: adds a description, drops durations, marks dates as manual', () => {
    const v1 = {
      ...makeProject({ tasks: [{ id: 'A', start: '2026-11-02', finish: '2026-11-04' }] }),
      schemaVersion: 1,
    } as Record<string, unknown>;
    delete v1.description;
    v1.tasks = { A: { ...(v1.tasks as Record<string, object>).A, mode: 'auto', durationDays: 3 } };

    const upgraded = migrateProject(v1);
    expect(upgraded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(upgraded.description).toBe('');
    expect(upgraded.tasks.A).toEqual({
      id: 'A',
      parentId: null,
      name: 'A',
      mode: 'manual',
      percentComplete: 0,
      start: '2026-11-02',
      finish: '2026-11-04',
    });
  });

  it('names the invalid fields', () => {
    const broken = { ...makeProject(), startDate: '2026-02-30', taskOrder: {} };
    expect(() => migrateProject(broken)).toThrow(/startDate, taskOrder/);
  });
});

describe('IndexedDB storage', () => {
  it('round-trips a project and lists it', async () => {
    const project = makeProject({ tasks: [{ id: 'A', start: '2026-11-02' }] });
    await saveProject(project);
    expect(await loadProject(project.id)).toEqual(project);
    expect(await listProjects()).toContainEqual(
      expect.objectContaining({ id: project.id, name: 'Test project' }),
    );
  });

  it('returns undefined for an unknown id', async () => {
    expect(await loadProject('missing')).toBeUndefined();
  });

  it('starts with an empty, untitled project and reopens it next time', async () => {
    const first = await loadInitialProject();
    expect(first.persistent).toBe(true);
    expect(first.project).toMatchObject({
      name: 'Untitled project',
      description: '',
      taskOrder: [],
    });
    const second = await loadInitialProject();
    expect(second.project.id).toBe(first.project.id);
  });
});

describe('startAutosave', () => {
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.getState().loadProject(makeProject());
    stop = startAutosave(500);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('saves once, after the debounce delay, and remembers the project', async () => {
    const { id } = useProjectStore.getState().project;
    useProjectStore.getState().dispatch(renameProject('First'));
    useProjectStore.getState().dispatch(renameProject('Second'));
    expect(await loadProject(id)).toBeUndefined();

    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();
    await vi.waitFor(async () => expect((await loadProject(id))?.name).toBe('Second'));
    expect(await getLastOpenedId()).toBe(id);
  });
});
