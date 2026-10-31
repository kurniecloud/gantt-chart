import { isISODate } from '../domain/dates';
import { CURRENT_SCHEMA_VERSION } from '../domain/project';
import { PRIORITIES } from '../domain/taskInput';
import type { ISODate, Project } from '../domain/types';
import { migrateProject } from '../persistence/migrations';

// The app's own file format (`.gantt.json`): a small envelope around the project. Imported files
// are untrusted, so everything is checked before it can reach the store.

export const FILE_FORMAT = 'gantt-chart';
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export class ProjectFileError extends Error {}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function serializeProject(project: Project, exportedAt: ISODate): string {
  return JSON.stringify(
    { format: FILE_FORMAT, schemaVersion: project.schemaVersion, exportedAt, project },
    null,
    2,
  );
}

/** e.g. "Website relaunch" → "website-relaunch.gantt.json". */
export function exportFileName(project: Pick<Project, 'name'>): string {
  const slug = project.name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'project'}.gantt.json`;
}

/** Reads a `.gantt.json` file's text into a valid, current-schema project, or throws `ProjectFileError`. */
export function parseProjectFile(text: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProjectFileError("This file isn't valid JSON.");
  }
  if (!isRecord(data) || data.format !== FILE_FORMAT || !isRecord(data.project)) {
    throw new ProjectFileError("This isn't a Gantt Chart project file.");
  }

  let project: Project;
  try {
    project = migrateProject(data.project);
  } catch (error) {
    throw new ProjectFileError(error instanceof Error ? error.message : String(error));
  }

  const problems = contentProblems(project);
  if (problems.length > 0) {
    const shown = problems.slice(0, 3).join('; ');
    const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : '';
    throw new ProjectFileError(`The project data is damaged: ${shown}${more}.`);
  }
  return { ...project, schemaVersion: CURRENT_SCHEMA_VERSION, taskOrder: displayOrder(project) };
}

function contentProblems(project: Project): string[] {
  const problems: string[] = [];
  const tasks = project.tasks as Record<string, unknown>;

  for (const [key, value] of Object.entries(tasks)) {
    if (!isRecord(value)) {
      problems.push(`task ${key} is not an object`);
      continue;
    }
    const label = typeof value.name === 'string' ? `task “${value.name}”` : `task ${key}`;
    if (value.id !== key) problems.push(`${label} has a mismatched id`);
    if (typeof value.name !== 'string') problems.push(`${label} has no name`);
    if (value.parentId !== null && (typeof value.parentId !== 'string' || !tasks[value.parentId])) {
      problems.push(`${label} has an unknown parent`);
    }
    const dateFields = {
      start: 'start',
      finish: 'end',
      actualStart: 'actual start',
      actualFinish: 'actual end',
    } as const;
    for (const [field, name] of Object.entries(dateFields)) {
      if (value[field] !== undefined && !isISODate(value[field])) {
        problems.push(`${label} has an invalid ${name} date`);
      }
    }
    if (value.priority !== undefined && !PRIORITIES.includes(value.priority as never)) {
      problems.push(`${label} has an unknown priority`);
    }
    if (value.collapsed !== undefined && typeof value.collapsed !== 'boolean') {
      problems.push(`${label} has an invalid collapsed flag`);
    }
  }

  // Parent chains must end at the top level (no loops).
  for (const id of Object.keys(tasks)) {
    const seen = new Set<string>();
    let current: string | null = id;
    while (current && project.tasks[current]) {
      if (seen.has(current)) {
        problems.push(`task ${id} is inside a parent loop`);
        break;
      }
      seen.add(current);
      current = project.tasks[current]!.parentId;
    }
  }

  const order = project.taskOrder as unknown[];
  const unique = new Set(order);
  if (
    order.some((id) => typeof id !== 'string' || !tasks[id]) ||
    unique.size !== order.length ||
    unique.size !== Object.keys(tasks).length
  ) {
    problems.push("the task order doesn't match the tasks");
  }

  for (const [key, dep] of Object.entries(project.dependencies as Record<string, unknown>)) {
    if (
      !isRecord(dep) ||
      dep.id !== key ||
      typeof dep.predecessorId !== 'string' ||
      typeof dep.successorId !== 'string' ||
      !tasks[dep.predecessorId] ||
      !tasks[dep.successorId] ||
      !['FS', 'SS', 'FF', 'SF'].includes(dep.type as string) ||
      typeof dep.lagDays !== 'number'
    ) {
      problems.push(`dependency ${key} is invalid`);
    }
  }

  for (const milestone of project.milestones as unknown[]) {
    if (
      !isRecord(milestone) ||
      typeof milestone.id !== 'string' ||
      typeof milestone.name !== 'string' ||
      !isISODate(milestone.date)
    ) {
      problems.push('a milestone is invalid');
    }
  }
  return problems;
}

/** Task order rebuilt so every task is followed by its subtasks (what the commands expect). */
function displayOrder(project: Project): string[] {
  const children = new Map<string | null, string[]>();
  for (const id of project.taskOrder) {
    const parentId = project.tasks[id]!.parentId;
    children.set(parentId, [...(children.get(parentId) ?? []), id]);
  }
  const order: string[] = [];
  const visit = (parentId: string | null) => {
    for (const id of children.get(parentId) ?? []) {
      order.push(id);
      visit(id);
    }
  };
  visit(null);
  return order;
}
