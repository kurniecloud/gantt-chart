import { addWorkingDays, finishFromStart, nextWorkingDay, workingDaysBetween } from './calendar';
import { newId } from './ids';
import { calendarFor, createProject, createTask } from './project';
import type { ISODate, Project } from './types';

type Outline = { name: string; duration?: number; children?: Outline[] };

const OUTLINE: Outline[] = [
  {
    name: 'Planning',
    children: [
      { name: 'Gather requirements', duration: 3 },
      { name: 'Write specification', duration: 4 },
      { name: 'Specification approved', duration: 0 },
    ],
  },
  {
    name: 'Build',
    children: [
      { name: 'Design UI', duration: 5 },
      { name: 'Implement features', duration: 10 },
      { name: 'Test', duration: 5 },
    ],
  },
  { name: 'Launch', duration: 0 },
];

/**
 * A small demo project used on first launch: leaf tasks are chained finish-to-start from
 * `startDate`, and summary tasks span their children.
 */
export function createSampleProject(startDate: ISODate): Project {
  const project = createProject('Sample project', startDate);
  const calendar = calendarFor(project);
  let previous: { id: string; finish: ISODate } | null = null;

  const add = (item: Outline, parentId: string | null): { start: ISODate; finish: ISODate } => {
    const task = createTask(project, { name: item.name, parentId });
    project.tasks[task.id] = task;
    project.taskOrder.push(task.id);

    if (item.children) {
      const spans = item.children.map((child) => add(child, task.id));
      task.start = spans[0]?.start ?? task.start;
      task.finish = spans[spans.length - 1]?.finish ?? task.finish;
      task.durationDays = workingDaysBetween(calendar, task.start, task.finish);
      return task;
    }

    const duration = item.duration ?? 1;
    // FS+0: a task starts the working day after its predecessor finishes; a milestone sits on
    // the predecessor's finish day (see the scheduling-engine skill).
    if (!previous) task.start = nextWorkingDay(calendar, startDate);
    else if (duration === 0) task.start = previous.finish;
    else task.start = addWorkingDays(calendar, previous.finish, 1);
    task.durationDays = duration;
    task.finish = finishFromStart(calendar, task.start, duration);

    if (previous) {
      const dependency = {
        id: newId(),
        predecessorId: previous.id,
        successorId: task.id,
        type: 'FS' as const,
        lagDays: 0,
      };
      project.dependencies[dependency.id] = dependency;
    }
    previous = { id: task.id, finish: task.finish };
    return task;
  };

  for (const item of OUTLINE) add(item, null);
  return project;
}
