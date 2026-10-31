import { isISODate } from '../domain/dates';
import { CURRENT_SCHEMA_VERSION } from '../domain/project';
import type { Project } from '../domain/types';

type RawProject = Record<string, unknown>;

/**
 * `MIGRATIONS[n]` upgrades a project from schema version n to n + 1.
 * Add an entry (with a test) every time `CURRENT_SCHEMA_VERSION` is bumped.
 */
const MIGRATIONS: Record<number, (project: RawProject) => RawProject> = {
  // v2: project description; task durations are derived from dates, which the user sets
  // directly (there was no scheduler in v1, so every task's dates were effectively manual).
  1: (project) => ({
    ...project,
    description: '',
    tasks: Object.fromEntries(
      Object.entries(isRecord(project.tasks) ? project.tasks : {}).map(([id, task]) => {
        if (!isRecord(task)) return [id, task];
        const { durationDays, ...rest } = task;
        return [id, { ...rest, mode: 'manual' }];
      }),
    ),
  }),
  // v3: project milestones.
  2: (project) => ({ ...project, milestones: [] }),
};

function isRecord(value: unknown): value is RawProject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Upgrades stored or imported project data to the current schema and checks its basic shape. */
export function migrateProject(raw: unknown): Project {
  if (!isRecord(raw)) throw new Error('Project data is not an object.');
  let version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('Project data has no valid schema version.');
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `This project was saved by a newer version of the app (schema ${version}). Please reload to update.`,
    );
  }

  let data = raw;
  while (version < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) throw new Error(`No migration from schema version ${version}.`);
    data = { ...migrate(data), schemaVersion: version + 1 };
    version += 1;
  }

  assertProjectShape(data);
  return data;
}

function assertProjectShape(data: RawProject): asserts data is Project {
  const problems: string[] = [];
  if (typeof data.id !== 'string') problems.push('id');
  if (typeof data.name !== 'string') problems.push('name');
  if (typeof data.description !== 'string') problems.push('description');
  if (!isISODate(data.startDate)) problems.push('startDate');
  if (typeof data.defaultCalendarId !== 'string') problems.push('defaultCalendarId');
  for (const key of ['tasks', 'dependencies', 'calendars', 'resources', 'assignments']) {
    if (!isRecord(data[key])) problems.push(key);
  }
  for (const key of ['taskOrder', 'baselines', 'customFields', 'milestones']) {
    if (!Array.isArray(data[key])) problems.push(key);
  }
  if (problems.length > 0) {
    throw new Error(`Project data is invalid (bad fields: ${problems.join(', ')}).`);
  }
}
