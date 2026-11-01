import { spanWeekdays, type DateSpan, type EffectiveSpan } from './taskDates';
import { childrenByParent } from './tree';
import type { ISODate, Milestone, Project } from './types';

export type ProjectLength = DateSpan & {
  /** Weekdays from `start` to `finish`, both included. */
  days: number;
};

export type ProjectSummary = {
  /** Tasks without subtasks — the work items. Parents only group them and aren't counted. */
  taskCount: number;
  /** Tasks with subtasks (not in `taskCount`). */
  parentCount: number;
  /** Earliest planned start → latest planned finish, or null when nothing is dated. */
  planned: ProjectLength | null;
  /** The same over actual dates, or null when no task has any. */
  actual: ProjectLength | null;
  /** Some task has started but not finished, so `actual` may run up to today. */
  inProgress: boolean;
};

/**
 * Totals for the whole project, whatever is collapsed. Lengths use the same rule as a parent
 * row: from the earliest start to the latest finish, so overlapping tasks don't add up.
 * `planned` and `actual` are the maps from `effectiveSpans` (actual with `today`).
 */
export function projectSummary(
  project: Project,
  planned: Map<string, EffectiveSpan>,
  actual: Map<string, EffectiveSpan>,
): ProjectSummary {
  const children = childrenByParent(project);
  let taskCount = 0;
  let parentCount = 0;
  let inProgress = false;
  for (const id of project.taskOrder) {
    const task = project.tasks[id];
    if (!task) continue;
    if (children.has(id)) parentCount += 1;
    else taskCount += 1;
    // Same test as the timeline's "(in progress)" line: the task's own actual dates are drawn.
    const span = actual.get(id);
    if (span && !span.fromSubtasks && task.actualStart && !task.actualFinish) inProgress = true;
  }
  return {
    taskCount,
    parentCount,
    planned: projectLength(planned.values()),
    actual: projectLength(actual.values()),
    inProgress,
  };
}

/** Earliest start → latest finish over all spans, with its weekday count; null if there are none. */
export function projectLength(spans: Iterable<DateSpan>): ProjectLength | null {
  let start: ISODate | null = null;
  let finish: ISODate | null = null;
  for (const span of spans) {
    if (start === null || span.start < start) start = span.start;
    if (finish === null || span.finish > finish) finish = span.finish;
  }
  if (start === null || finish === null) return null;
  return { start, finish, days: spanWeekdays({ start, finish }) };
}

export type MilestoneSummary = {
  total: number;
  /** Milestones today or later. */
  upcoming: number;
  /** The earliest upcoming milestone (the first listed if several share its day), or null. */
  next: Milestone | null;
};

/** How many milestones there are and how many are still to come (today counts as upcoming). */
export function milestoneSummary(milestones: Milestone[], today: ISODate): MilestoneSummary {
  let upcoming = 0;
  let next: Milestone | null = null;
  for (const milestone of milestones) {
    if (milestone.date < today) continue;
    upcoming += 1;
    if (!next || milestone.date < next.date) next = milestone;
  }
  return { total: milestones.length, upcoming, next };
}
