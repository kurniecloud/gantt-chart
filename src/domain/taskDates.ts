import { childrenByParent } from './tree';
import type { ISODate, Project, Task } from './types';
import { nextWeekday, previousWeekday, weekdayIndex } from './workweek';

export type DateSpan = { start: ISODate; finish: ISODate };

export type EffectiveSpan = DateSpan & {
  /** True when the span comes from the task's subtasks rather than its own dates. */
  fromSubtasks: boolean;
};

/**
 * The span a task's own dates describe: both dates → that range; only one → a single day;
 * neither → null. Reversed dates (bad imported data) are put back in order.
 */
export function ownSpan(task: Pick<Task, 'start' | 'finish'>): DateSpan | null {
  const start = task.start ?? task.finish;
  const finish = task.finish ?? task.start;
  if (!start || !finish) return null;
  return start <= finish ? { start, finish } : { start: finish, finish: start };
}

/**
 * The span to draw for every task that has one. A task with dated descendants spans them
 * (earliest start → latest finish); otherwise it uses its own dates.
 */
export function effectiveSpans(project: Project): Map<string, EffectiveSpan> {
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
    const own = task ? ownSpan(task) : null;
    if (own) result.set(id, { ...own, fromSubtasks: false });
    return own;
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
