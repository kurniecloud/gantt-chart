import { calendarFor, createProject } from '../domain/project';
import type { DependencyType, ISODate, Priority, Project } from '../domain/types';

type TaskSpec = {
  id: string;
  name?: string;
  start?: ISODate;
  finish?: ISODate;
  parent?: string;
  priority?: Priority;
  collapsed?: boolean;
  deps?: { from: string; type?: DependencyType; lag?: number }[];
};

type ProjectSpec = {
  name?: string;
  description?: string;
  start?: ISODate;
  tasks?: TaskSpec[];
  holidays?: ISODate[];
  workingWeekdays?: boolean[];
};

/**
 * Builds a project for tests with readable ids. List tasks in display order (each parent before
 * its subtasks). Defaults: starts Monday 2026-11-02, Mon–Fri calendar, tasks have no dates.
 */
export function makeProject(spec: ProjectSpec = {}): Project {
  const project = createProject(spec.name ?? 'Test project', spec.start ?? '2026-11-02');
  project.description = spec.description ?? '';
  const calendar = calendarFor(project);
  if (spec.holidays) {
    calendar.exceptions = spec.holidays.map((date) => ({ date, working: false }));
  }
  if (spec.workingWeekdays) calendar.workingWeekdays = spec.workingWeekdays;

  for (const t of spec.tasks ?? []) {
    project.tasks[t.id] = {
      id: t.id,
      parentId: t.parent ?? null,
      name: t.name ?? t.id,
      mode: 'manual',
      percentComplete: 0,
      ...(t.start && { start: t.start }),
      ...(t.finish && { finish: t.finish }),
      ...(t.priority && { priority: t.priority }),
      ...(t.collapsed && { collapsed: true }),
    };
    project.taskOrder.push(t.id);
    for (const [i, dep] of (t.deps ?? []).entries()) {
      const id = `${dep.from}->${t.id}#${i}`;
      project.dependencies[id] = {
        id,
        predecessorId: dep.from,
        successorId: t.id,
        type: dep.type ?? 'FS',
        lagDays: dep.lag ?? 0,
      };
    }
  }
  return project;
}
