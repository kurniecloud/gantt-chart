import { ancestorIds, leafSuccessors } from './dependencies';
import { ownSpan } from './taskDates';
import { childrenByParent } from './tree';
import type { Project } from './types';
import { previousWeekday, weekdayIndex } from './workweek';

export type CriticalPathResult = {
  /** Every critical task: the subtasks on the chain plus all of their parents. */
  criticalIds: Set<string>;
  /** Just the subtasks (leaf tasks) on the chain. */
  leafIds: Set<string>;
};

/**
 * The critical path as a **driving chain** over the tasks' own dates and "blocked by" links:
 *
 * 1. Start from the task(s) that finish on the project's last day.
 * 2. Step back to the blocker(s) that finish latest — the one(s) holding this task up. Ties all
 *    count. Repeat until a task has no blockers.
 *
 * Spare days between tasks don't break the chain. Links to/from parents count for all their
 * subtasks. Undated tasks are passed through (if B waits for undated U, which waits for A, then
 * A drives B). Nothing is rescheduled.
 */
export function criticalPath(project: Project): CriticalPathResult {
  const children = childrenByParent(project);
  const finishes = new Map<string, number>();
  for (const id of project.taskOrder) {
    const task = project.tasks[id];
    if (!task || children.has(id)) continue;
    const span = ownSpan(task);
    if (span) finishes.set(id, weekdayIndex(previousWeekday(span.finish)));
  }
  const empty = { criticalIds: new Set<string>(), leafIds: new Set<string>() };
  if (finishes.size === 0) return empty;

  // Leaf → the leaves blocking it.
  const blockers = new Map<string, string[]>();
  for (const [from, tos] of leafSuccessors(project)) {
    for (const to of tos) blockers.set(to, [...(blockers.get(to) ?? []), from]);
  }

  /** Dated blockers of a leaf, looking through undated ones. */
  const datedBlockers = (id: string): string[] => {
    const found = new Set<string>();
    const seen = new Set<string>([id]);
    const queue = [...(blockers.get(id) ?? [])];
    while (queue.length > 0) {
      const next = queue.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      if (finishes.has(next)) found.add(next);
      else queue.push(...(blockers.get(next) ?? []));
    }
    return [...found];
  };

  const projectFinish = Math.max(...finishes.values());
  const leafIds = new Set<string>();
  const queue = [...finishes].filter(([, finish]) => finish === projectFinish).map(([id]) => id);
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (leafIds.has(id)) continue; // also stops loops in bad data
    leafIds.add(id);
    const candidates = datedBlockers(id);
    if (candidates.length === 0) continue;
    const latest = Math.max(...candidates.map((c) => finishes.get(c)!));
    queue.push(...candidates.filter((c) => finishes.get(c) === latest));
  }

  const criticalIds = new Set(leafIds);
  for (const id of leafIds) ancestorIds(project, id).forEach((a) => criticalIds.add(a));
  return { criticalIds, leafIds };
}
