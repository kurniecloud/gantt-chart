import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project } from '../domain/types';
import { migrateProject } from './migrations';

const DB_NAME = 'gantt-chart';
const DB_VERSION = 1;
const LAST_OPENED_KEY = 'lastOpenedProjectId';

type StoredProject = {
  id: string;
  name: string;
  /** Epoch milliseconds of the last save. */
  updatedAt: number;
  project: Project;
};

export type ProjectSummary = Pick<StoredProject, 'id' | 'name' | 'updatedAt'>;

interface GanttDB extends DBSchema {
  projects: { key: string; value: StoredProject; indexes: { updatedAt: number } };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<GanttDB>> | null = null;

function db(): Promise<IDBPDatabase<GanttDB>> {
  dbPromise ??= openDB<GanttDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const projects = database.createObjectStore('projects', { keyPath: 'id' });
      projects.createIndex('updatedAt', 'updatedAt');
      database.createObjectStore('meta');
    },
  });
  return dbPromise;
}

export async function saveProject(project: Project): Promise<void> {
  await (
    await db()
  ).put('projects', {
    id: project.id,
    name: project.name,
    updatedAt: Date.now(),
    project,
  });
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const stored = await (await db()).get('projects', id);
  return stored ? migrateProject(stored.project) : undefined;
}

/** Most recently saved first. */
export async function listProjects(): Promise<ProjectSummary[]> {
  const all = await (await db()).getAllFromIndex('projects', 'updatedAt');
  return all.reverse().map(({ id, name, updatedAt }) => ({ id, name, updatedAt }));
}

export async function deleteProject(id: string): Promise<void> {
  await (await db()).delete('projects', id);
}

export async function getLastOpenedId(): Promise<string | undefined> {
  const value = await (await db()).get('meta', LAST_OPENED_KEY);
  return typeof value === 'string' ? value : undefined;
}

export async function setLastOpenedId(id: string): Promise<void> {
  await (await db()).put('meta', id, LAST_OPENED_KEY);
}
