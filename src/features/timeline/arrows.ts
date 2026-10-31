import type { EffectiveSpan } from '../../domain/taskDates';
import type { TaskRow } from '../../domain/tree';
import type { Project } from '../../domain/types';
import { nextWeekday, previousWeekday, weekdayIndex } from '../../domain/workweek';
import { barGeometry, type TimelineScale } from './scale';

/** Horizontal step out of the blocking bar and into the blocked one, in px. */
export const ARROW_STUB = 8;
/** Length of the arrowhead, in px. */
export const ARROW_HEAD = 6;
/** Bars narrower than this are drawn at this width (CSS min-width). */
const MIN_BAR_WIDTH = 4;

export type DependencyArrow = {
  key: string;
  /** Rows (in the visible list) the arrow starts and ends on — for culling. */
  fromRow: number;
  toRow: number;
  /** SVG path in timeline-body coordinates. */
  path: string;
  /** The blocked task starts on or before the day its blocker finishes. */
  broken: boolean;
  /** Tooltip, e.g. "Build → Test". */
  label: string;
  minX: number;
  maxX: number;
};

/**
 * Route from the end of one bar to the start of another. With room, the line steps out, turns
 * to the target row and runs in. Without room (the target starts before the source ends, or
 * right after it), it steps out, drops to the row boundary next to the target, runs back past
 * the target's start along that boundary, and comes in from the left — so the long vertical
 * stays just right of the source bar instead of cutting across bars in the rows between.
 */
export function arrowPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  rowHeight: number,
): string {
  const out = fromX + ARROW_STUB;
  if (toX - ARROW_HEAD >= out) return `M${fromX} ${fromY}H${out}V${toY}H${toX}`;
  const boundaryY = toY > fromY ? toY - rowHeight / 2 : toY + rowHeight / 2;
  const back = toX - ARROW_STUB - ARROW_HEAD;
  return `M${fromX} ${fromY}H${out}V${boundaryY}H${back}V${toY}H${toX}`;
}

/**
 * One arrow per blocking link between visible bars. A task hidden in a collapsed parent is drawn
 * as that parent; links that collapse into one row are skipped; several links between the same
 * two rows become one arrow.
 */
export function dependencyArrows(
  project: Project,
  rows: TaskRow[],
  spans: Map<string, EffectiveSpan>,
  scale: TimelineScale,
  rowHeight: number,
): DependencyArrow[] {
  const rowIndex = new Map(rows.map((row, index) => [row.id, index]));
  const visibleRow = (taskId: string) => {
    const seen = new Set<string>();
    let current: string | null = taskId;
    while (current && !seen.has(current)) {
      seen.add(current);
      const index = rowIndex.get(current);
      if (index !== undefined) return { id: current, index };
      current = project.tasks[current]?.parentId ?? null;
    }
    return null;
  };

  const arrows = new Map<string, DependencyArrow>();
  for (const dep of Object.values(project.dependencies)) {
    const from = visibleRow(dep.predecessorId);
    const to = visibleRow(dep.successorId);
    if (!from || !to || from.index === to.index) continue;
    const fromSpan = spans.get(from.id);
    const toSpan = spans.get(to.id);
    if (!fromSpan || !toSpan) continue;

    const blocker = spans.get(dep.predecessorId);
    const blocked = spans.get(dep.successorId);
    const broken =
      !!blocker &&
      !!blocked &&
      weekdayIndex(nextWeekday(blocked.start)) <= weekdayIndex(previousWeekday(blocker.finish));
    const names = `${project.tasks[dep.predecessorId]?.name} → ${project.tasks[dep.successorId]?.name}`;

    const key = `${from.id}→${to.id}`;
    const existing = arrows.get(key);
    if (existing) {
      existing.broken ||= broken;
      existing.label = `${existing.label}\n${names}`;
      continue;
    }

    const fromBar = barGeometry(scale, fromSpan);
    const toBar = barGeometry(scale, toSpan);
    const fromX = fromBar.x + Math.max(fromBar.width, MIN_BAR_WIDTH);
    const toX = toBar.x;
    const centre = (index: number) => index * rowHeight + rowHeight / 2;
    arrows.set(key, {
      key,
      fromRow: from.index,
      toRow: to.index,
      path: arrowPath(fromX, centre(from.index), toX, centre(to.index), rowHeight),
      broken,
      label: names,
      minX: Math.min(fromX, toX - ARROW_STUB - ARROW_HEAD),
      maxX: Math.max(fromX + ARROW_STUB, toX),
    });
  }

  for (const arrow of arrows.values()) {
    if (arrow.broken) arrow.label += '\nStarts before the task blocking it has finished.';
  }
  return [...arrows.values()];
}
