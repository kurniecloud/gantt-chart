import { childrenByParent } from './tree';
import type { ISODate, Project, Task } from './types';
import { fromWeekdayIndex, nextWeekday, previousWeekday, weekdayIndex } from './workweek';

export type DateSpan = { start: ISODate; finish: ISODate };

export type EffectiveSpan = DateSpan & {
  /** True when the span comes from the task's subtasks rather than its own dates. */
  fromSubtasks: boolean;
};

/** Which dates: the plan (`start`/`finish`) or what actually happened (`actualStart`/…). */
export type DateKind = 'planned' | 'actual';

/**
 * The span a task's own dates describe: both dates → that range; only one → a single day;
 * neither → null. Reversed dates (bad imported data) are put back in order.
 */
export function ownSpan(task: Pick<Task, 'start' | 'finish'>): DateSpan | null {
  return spanOf(task.start, task.finish);
}

/**
 * Like `ownSpan` for the actual dates; `null` unless at least one is set. With `today`, a task
 * that has started but not finished runs up to today (the last weekday on or before it), or is
 * one day long if it starts after today.
 */
export function ownActualSpan(
  task: Pick<Task, 'actualStart' | 'actualFinish'>,
  today?: ISODate,
): DateSpan | null {
  if (today && task.actualStart && !task.actualFinish) {
    const upTo = previousWeekday(today);
    return { start: task.actualStart, finish: upTo > task.actualStart ? upTo : task.actualStart };
  }
  return spanOf(task.actualStart, task.actualFinish);
}

function spanOf(a: ISODate | undefined, b: ISODate | undefined): DateSpan | null {
  const start = a ?? b;
  const finish = b ?? a;
  if (!start || !finish) return null;
  return start <= finish ? { start, finish } : { start: finish, finish: start };
}

/**
 * The span to draw for every task that has one. A task with dated descendants spans them
 * (earliest start → latest finish); otherwise it uses its own dates. `kind` picks planned
 * (default) or actual dates.
 */
export function effectiveSpans(
  project: Project,
  kind: DateKind = 'planned',
  /** For actual dates: run tasks in progress up to this day (see `ownActualSpan`). */
  today?: ISODate,
): Map<string, EffectiveSpan> {
  const own = kind === 'planned' ? ownSpan : (task: Task) => ownActualSpan(task, today);
  const children = childrenByParent(project);
  const result = new Map<string, EffectiveSpan>();

  const compute = (id: string): DateSpan | null => {
    let fromChildren: DateSpan | null = null;
    for (const childId of children.get(id) ?? []) {
      const span = compute(childId);
      if (span) fromChildren = fromChildren ? union(fromChildren, span) : span;
    }
    if (fromChildren) {
      result.set(id, { ...fromChildren, fromSubtasks: true });
      return fromChildren;
    }
    const task = project.tasks[id];
    const span = task ? own(task) : null;
    if (span) result.set(id, { ...span, fromSubtasks: false });
    return span;
  };

  for (const id of children.get(null) ?? []) compute(id);
  return result;
}

function union(a: DateSpan, b: DateSpan): DateSpan {
  return {
    start: a.start < b.start ? a.start : b.start,
    finish: a.finish > b.finish ? a.finish : b.finish,
  };
}

/** Weekdays (Mon–Fri) a span covers, counting both ends. */
export function spanWeekdays(span: DateSpan): number {
  const first = weekdayIndex(nextWeekday(span.start));
  const last = weekdayIndex(previousWeekday(span.finish));
  return Math.max(last - first + 1, 0);
}

/** What dragging a bar changes: both dates (`move`), or just the start or end (resize). */
export type DragMode = 'move' | 'start' | 'end';

/**
 * A span shifted by `delta` weekdays. Moving keeps the length; resizing never goes below one day.
 * Weekend ends are first pulled onto the weekdays inside the span.
 */
export function shiftSpan(span: DateSpan, mode: DragMode, delta: number): DateSpan {
  const first = weekdayIndex(nextWeekday(span.start));
  const last = Math.max(first, weekdayIndex(previousWeekday(span.finish)));
  const start =
    mode === 'end' ? first : Math.min(first + delta, mode === 'start' ? last : Infinity);
  const finish =
    mode === 'start' ? last : Math.max(last + delta, mode === 'end' ? first : -Infinity);
  return { start: fromWeekdayIndex(start), finish: fromWeekdayIndex(finish) };
}
