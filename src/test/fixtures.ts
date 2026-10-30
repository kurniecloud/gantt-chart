import { finishFromStart, nextWorkingDay } from '../domain/calendar';
import { calendarFor, createProject } from '../domain/project';
import type { DependencyType, ISODate, Project, Task } from '../domain/types';

type TaskSpec = {
  id: string;
  name?: string;
  duration?: number;
  start?: ISODate;
  parent?: string;
  mode?: Task['mode'];
  percentComplete?: number;
  deps?: { from: string; type?: DependencyType; lag?: number }[];
};

type ProjectSpec = {
  start?: ISODate;
  tasks?: TaskSpec[];
  holidays?: ISODate[];
  workingWeekdays?: boolean[];
};

/**
 * Builds a project for tests with readable ids. Defaults: starts Monday 2026-11-02, Mon–Fri
 * calendar, every task auto-scheduled at the project start (no scheduling is run).
 */
export function makeProject(spec: ProjectSpec = {}): Project {
  const project = createProject('Test project', spec.start ?? '2026-11-02');
  const calendar = calendarFor(project);
  if (spec.holidays) {
    calendar.exceptions = spec.holidays.map((date) => ({ date, working: false }));
  }
  if (spec.workingWeekdays) calendar.workingWeekdays = spec.workingWeekdays;

  for (const t of spec.tasks ?? []) {
    const duration = t.duration ?? 1;
    const start = nextWorkingDay(calendar, t.start ?? project.startDate);
    project.tasks[t.id] = {
      id: t.id,
      parentId: t.parent ?? null,
      name: t.name ?? t.id,
      mode: t.mode ?? 'auto',
      start,
      finish: finishFromStart(calendar, start, duration),
      durationDays: duration,
      percentComplete: t.percentComplete ?? 0,
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
