import {
  STANDARD_CALENDAR_ID,
  createStandardCalendar,
  finishFromStart,
  nextWorkingDay,
} from './calendar';
import { newId } from './ids';
import type { Calendar, ISODate, Project, Task } from './types';

/** Bump together with a migration in `src/persistence/migrations.ts`. */
export const CURRENT_SCHEMA_VERSION = 1;

export function createProject(name: string, startDate: ISODate): Project {
  const calendar = createStandardCalendar();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: newId(),
    name,
    startDate,
    defaultCalendarId: calendar.id,
    tasks: {},
    taskOrder: [],
    dependencies: {},
    calendars: { [calendar.id]: calendar },
    resources: {},
    assignments: {},
    baselines: [],
    customFields: [],
  };
}

export function calendarFor(project: Project, task?: Task): Calendar {
  const id = task?.calendarId ?? project.defaultCalendarId;
  return (
    project.calendars[id] ?? project.calendars[STANDARD_CALENDAR_ID] ?? createStandardCalendar()
  );
}

export function createTask(
  project: Project,
  fields: Partial<Omit<Task, 'id'>> & { name: string },
): Task {
  const durationDays = fields.durationDays ?? 1;
  const calendar = calendarFor(project);
  const start = nextWorkingDay(calendar, fields.start ?? project.startDate);
  return {
    id: newId(),
    parentId: null,
    mode: 'auto',
    percentComplete: 0,
    ...fields,
    start,
    finish: fields.finish ?? finishFromStart(calendar, start, durationDays),
    durationDays,
  };
}

/** Depth of each task in the hierarchy (0 = top level), in `taskOrder` order. */
export function taskDepths(project: Project): Map<string, number> {
  const depths = new Map<string, number>();
  for (const id of project.taskOrder) {
    const parentId = project.tasks[id]?.parentId;
    depths.set(id, parentId ? (depths.get(parentId) ?? 0) + 1 : 0);
  }
  return depths;
}
