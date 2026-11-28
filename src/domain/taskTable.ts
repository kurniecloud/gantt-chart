import { effectiveSpans } from './taskDates';
import { childrenByParent } from './tree';
import type { ISODate, Priority, Project } from './types';

export type TaskStatus = 'notStarted' | 'inProgress' | 'completed';

/** One task as a flat table row (the spreadsheet copy). */
export type TaskTableRow = {
  id: string;
  /** Outline number from 1: "1", "1.2", "1.2.3"… */
  number: string;
  /** 0 = top level. */
  depth: number;
  hasSubtasks: boolean;
  name: string;
  plannedStart?: ISODate;
  plannedEnd?: ISODate;
  actualStart?: ISODate;
  actualEnd?: ISODate;
  status: TaskStatus;
  owner: string;
  /** Outline numbers of the tasks blocking this one, in task-list order. */
  blockedBy: string[];
  /** Outline numbers of the tasks this one blocks, in task-list order. */
  blocking: string[];
  priority?: Priority;
  remarks: string;
};

/** Started and not finished → in progress; started and finished → completed; else not started. */
export function taskStatus(
  actualStart: ISODate | undefined,
  actualEnd: ISODate | undefined,
): TaskStatus {
  if (!actualStart) return 'notStarted';
  return actualEnd ? 'completed' : 'inProgress';
}

/**
 * Every task as a table row, in task-list order (collapsed subtasks included). Leaves show their
 * dates as saved. A parent's planned dates span its subtasks as the timeline draws them; its
 * actual start is the earliest of its subtasks' and its actual end the latest, but only once
 * every subtask is completed — so a parent is in progress while any subtask is unfinished.
 */
export function taskTable(project: Project): TaskTableRow[] {
  const children = childrenByParent(project);
  const planned = effectiveSpans(project);
  const rows: TaskTableRow[] = [];

  const visit = (id: string, number: string, depth: number): TaskTableRow => {
    const task = project.tasks[id]!;
    const span = planned.get(id);
    const fromSubtasks = span?.fromSubtasks === true;
    const row: TaskTableRow = {
      id,
      number,
      depth,
      hasSubtasks: false,
      name: task.name,
      plannedStart: fromSubtasks ? span.start : task.start,
      plannedEnd: fromSubtasks ? span.finish : task.finish,
      actualStart: task.actualStart,
      actualEnd: task.actualFinish,
      status: 'notStarted',
      owner: task.owner ?? '',
      blockedBy: [],
      blocking: [],
      priority: task.priority,
      remarks: task.notes ?? '',
    };
    rows.push(row);

    const subtasks = (children.get(id) ?? []).map((childId, i) =>
      visit(childId, `${number}.${i + 1}`, depth + 1),
    );
    row.hasSubtasks = subtasks.length > 0;
    if (subtasks.some((sub) => sub.actualStart || sub.actualEnd)) {
      row.actualStart = earliest(subtasks.map((sub) => sub.actualStart));
      row.actualEnd = subtasks.every((sub) => sub.status === 'completed')
        ? latest(subtasks.map((sub) => sub.actualEnd))
        : undefined;
    }
    row.status = taskStatus(row.actualStart, row.actualEnd);
    return row;
  };

  (children.get(null) ?? []).forEach((id, i) => visit(id, String(i + 1), 0));

  // One pass over the links (not one per task): rows are in task-list order, so sorting by row
  // index lists linked tasks in that order.
  const index = new Map(rows.map((row, i) => [row.id, i]));
  const blockedBy = new Map<number, Set<number>>();
  const blocking = new Map<number, Set<number>>();
  for (const dep of Object.values(project.dependencies)) {
    const from = index.get(dep.predecessorId);
    const to = index.get(dep.successorId);
    if (from === undefined || to === undefined) continue;
    addTo(blockedBy, to, from);
    addTo(blocking, from, to);
  }
  const numbersOf = (set: Set<number> | undefined) =>
    [...(set ?? [])].sort((a, b) => a - b).map((i) => rows[i]!.number);
  rows.forEach((row, i) => {
    row.blockedBy = numbersOf(blockedBy.get(i));
    row.blocking = numbersOf(blocking.get(i));
  });
  return rows;
}

function addTo(map: Map<number, Set<number>>, key: number, value: number) {
  const set = map.get(key);
  if (set) set.add(value);
  else map.set(key, new Set([value]));
}

function earliest(dates: (ISODate | undefined)[]): ISODate | undefined {
  return dates.filter((d): d is ISODate => !!d).sort()[0];
}

function latest(dates: (ISODate | undefined)[]): ISODate | undefined {
  return dates
    .filter((d): d is ISODate => !!d)
    .sort()
    .at(-1);
}
