import { STANDARD_CALENDAR_ID, createStandardCalendar } from './calendar';
import { newId } from './ids';
import type { Calendar, ISODate, Project, Task } from './types';

/** Bump together with a migration in `src/persistence/migrations.ts`. */
export const CURRENT_SCHEMA_VERSION = 4;

export const DEFAULT_PROJECT_NAME = 'Untitled project';

export function createProject(name: string, startDate: ISODate): Project {
  const calendar = createStandardCalendar();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: newId(),
    name,
    description: '',
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
    milestones: [],
  };
}

export function calendarFor(project: Project, task?: Task): Calendar {
  const id = task?.calendarId ?? project.defaultCalendarId;
  return (
    project.calendars[id] ?? project.calendars[STANDARD_CALENDAR_ID] ?? createStandardCalendar()
  );
}

export type TaskFields = Pick<
  Task,
  'name' | 'start' | 'finish' | 'actualStart' | 'actualFinish' | 'priority'
>;

/** A new task with the given fields. Absent dates/priority are left off the object entirely. */
export function createTask(
  fields: TaskFields,
  parentId: string | null = null,
  id: string = newId(),
): Task {
  const task: Task = { id, parentId, name: fields.name, mode: 'manual', percentComplete: 0 };
  if (fields.start) task.start = fields.start;
  if (fields.finish) task.finish = fields.finish;
  if (fields.actualStart) task.actualStart = fields.actualStart;
  if (fields.actualFinish) task.actualFinish = fields.actualFinish;
  if (fields.priority) task.priority = fields.priority;
  return task;
}
