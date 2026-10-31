import { ancestorIds, leafSuccessors } from './dependencies';
import { ownSpan } from './taskDates';
import { childrenByParent } from './tree';
import type { Project } from './types';
import { nextWeekday, previousWeekday, weekdayIndex } from './workweek';

export type CriticalPathResult = {
  /** Critical tasks: leaves with no slack, plus every parent containing one. */
  criticalIds: Set<string>;
  /** Total slack in weekdays for each dated leaf task (negative = a dependency is violated). */
  slack: Map<string, number>;
};

/**
 * Critical path from the tasks' own dates and their finish-to-start dependencies (the dates are
 * fixed; nothing is rescheduled). Works in weekdays:
 *
 * - project finish = the latest finish of any dated leaf task;
 * - backward pass: late finish = min(project finish, each successor's late start − 1);
 * - total slack = late finish − finish; critical ⇔ slack ≤ 0.
 *
 * Undated tasks are ignored. Loops (only possible in bad imported data) are treated as if the
 * links weren't there.
 */
export function criticalPath(project: Project): CriticalPathResult {
  const children = childrenByParent(project);
  const dated = new Map<string, { start: number; finish: number }>();
  for (const id of project.taskOrder) {
    const task = project.tasks[id];
    if (!task || children.has(id)) continue;
    const span = ownSpan(task);
    if (!span) continue;
    const start = weekdayIndex(nextWeekday(span.start));
    const finish = Math.max(start, weekdayIndex(previousWeekday(span.finish)));
    dated.set(id, { start, finish });
  }
  if (dated.size === 0) return { criticalIds: new Set(), slack: new Map() };

  const projectFinish = Math.max(...[...dated.values()].map((d) => d.finish));
  const successors = new Map<string, string[]>();
  for (const [from, to] of leafSuccessors(project)) {
    if (!dated.has(from)) continue;
    successors.set(
      from,
      [...to].filter((id) => dated.has(id)),
    );
  }

  // Topological order (Kahn). Tasks left over are part of a loop.
  const indegree = new Map([...dated.keys()].map((id) => [id, 0]));
  for (const list of successors.values()) {
    for (const s of list) indegree.set(s, indegree.get(s)! + 1);
  }
  const order: string[] = [];
  const ready = [...dated.keys()].filter((id) => indegree.get(id) === 0);
  while (ready.length > 0) {
    const id = ready.pop()!;
    order.push(id);
    for (const s of successors.get(id) ?? []) {
      indegree.set(s, indegree.get(s)! - 1);
      if (indegree.get(s) === 0) ready.push(s);
    }
  }

  const lateFinish = new Map<string, number>();
  for (const id of order.reverse()) {
    let latest = projectFinish;
    for (const s of successors.get(id) ?? []) {
      const next = dated.get(s)!;
      const nextLateStart = lateFinish.get(s)! - (next.finish - next.start);
      latest = Math.min(latest, nextLateStart - 1);
    }
    lateFinish.set(id, latest);
  }

  const slack = new Map<string, number>();
  const criticalIds = new Set<string>();
  for (const [id, { finish }] of dated) {
    const value = (lateFinish.get(id) ?? projectFinish) - finish;
    slack.set(id, value);
    if (value <= 0) {
      criticalIds.add(id);
      ancestorIds(project, id).forEach((ancestor) => criticalIds.add(ancestor));
    }
  }
  return { criticalIds, slack };
}
