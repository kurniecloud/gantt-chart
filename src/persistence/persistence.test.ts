import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '../domain/project';
import { renameProject } from '../store/commands/projectCommands';
import { useProjectStore } from '../store/projectStore';
import { makeProject } from '../test/fixtures';
import { startAutosave } from './autosave';
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

  it('names the invalid fields', () => {
    const broken = { ...makeProject(), startDate: '2026-02-30', taskOrder: {} };
    expect(() => migrateProject(broken)).toThrow(/startDate, taskOrder/);
  });
});

describe('IndexedDB storage', () => {
  it('round-trips a project and lists it', async () => {
    const project = makeProject({ tasks: [{ id: 'A', duration: 2 }] });
    await saveProject(project);
    expect(await loadProject(project.id)).toEqual(project);
    expect(await listProjects()).toContainEqual(
      expect.objectContaining({ id: project.id, name: 'Test project' }),
    );
  });

  it('returns undefined for an unknown id', async () => {
    expect(await loadProject('missing')).toBeUndefined();
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
