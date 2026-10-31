import { Fragment, useCallback, type CSSProperties } from 'react';
import { shiftSpan, spanWeekdays, type EffectiveSpan } from '../../domain/taskDates';
import type { TaskRow } from '../../domain/tree';
import type { Task } from '../../domain/types';
import { shiftTaskDates } from '../../store/commands/taskCommands';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { formatDate } from '../../utils/formatDate';
import type { DependencyArrow } from './arrows';
import { DependencyArrows } from './DependencyArrows';
import { actualLabel, barLabel, type MilestoneMark } from './labels';
import { barGeometry, type TimelineScale } from './scale';
import { TaskBar } from './TaskBar';
import { useBarDrag } from './useBarDrag';
import styles from './Timeline.module.css';

type TimelineBodyProps = {
  scale: TimelineScale;
  rows: TaskRow[];
  tasks: Record<string, Task>;
  spans: Map<string, EffectiveSpan>;
  /** Actual-date spans (in-progress tasks run to today), drawn as a blue line under the bar. */
  actualSpans: Map<string, EffectiveSpan>;
  /** The rows to draw and their offsets, shared with the task list. */
  virtualRows: { index: number; top: number }[];
  /** Height of every row plus the "+" row, in px. */
  rowsHeight: number;
  /** Today's day slot (light yellow), or null on a weekend. */
  todaySlot: { x: number; width: number } | null;
  /** Milestone days (light green). */
  milestones: MilestoneMark[];
  /** Tasks on the critical path, or null when the critical path is hidden. */
  criticalIds: Set<string> | null;
  /** Blocking links between visible bars. */
  arrows: DependencyArrow[];
  rowHeight: number;
};

export function TimelineBody({
  scale,
  rows,
  tasks,
  spans,
  actualSpans,
  virtualRows,
  rowsHeight,
  todaySlot,
  milestones,
  criticalIds,
  arrows,
  rowHeight,
}: TimelineBodyProps) {
  const openDialog = useUiStore((s) => s.openDialog);
  const dispatch = useProjectStore((s) => s.dispatch);
  const { drag, onBarPointerDown, wasDrag } = useBarDrag(scale.dayWidth, (taskId, mode, delta) =>
    dispatch(shiftTaskDates(taskId, mode, delta)),
  );
  const onEdit = useCallback(
    (taskId: string) => {
      if (!wasDrag()) openDialog({ kind: 'edit-task', taskId });
    },
    [openDialog, wasDrag],
  );

  return (
    <div
      className={styles.body}
      role="group"
      aria-label="Timeline"
      data-mode={scale.mode}
      style={{ '--column-width': `${scale.columnWidth}px` } as CSSProperties}
    >
      {milestones.map((m) => (
        <div
          key={m.date}
          className={styles.milestoneColumn}
          data-testid="milestone-day"
          title={m.label}
          style={{ left: m.x, width: m.width }}
        />
      ))}
      {todaySlot && (
        <div
          className={styles.todayColumn}
          data-testid="today-highlight"
          style={{ left: todaySlot.x, width: todaySlot.width }}
        />
      )}
      <div className={styles.rowLines} style={{ height: rowsHeight }} />
      <DependencyArrows
        arrows={arrows}
        firstRow={virtualRows[0]?.index ?? 0}
        lastRow={virtualRows.at(-1)?.index ?? 0}
        rowHeight={rowHeight}
      />
      {virtualRows.map(({ index, top }) => {
        const row = rows[index];
        const actual = row && actualSpans.get(row.id);
        const task = row && tasks[row.id];
        if (!actual || !task) return null;
        const { x, width } = barGeometry(scale, actual);
        const inProgress = !actual.fromSubtasks && !!task.actualStart && !task.actualFinish;
        const label = actualLabel(actual, inProgress);
        return (
          <div
            key={`actual-${row.id}`}
            className={styles.actualLine}
            data-testid="actual-line"
            aria-label={`${task.name}: ${label}`}
            role="img"
            title={label}
            style={{ transform: `translate(${x}px, ${top}px)`, width }}
          />
        );
      })}
      {virtualRows.map(({ index, top }) => {
        const row = rows[index];
        const span = row && spans.get(row.id);
        const task = row && tasks[row.id];
        if (!row || !span || !task) return null;
        const dragging = drag?.taskId === row.id;
        const shown = dragging ? shiftSpan(span, drag.mode, drag.delta) : span;
        const { x, width } = barGeometry(scale, shown);
        const critical = criticalIds?.has(row.id) ?? false;
        return (
          <Fragment key={row.id}>
            <TaskBar
              id={row.id}
              label={barLabel(task.name, span, task.priority, critical)}
              x={x}
              width={width}
              top={top}
              summary={row.hasChildren}
              critical={critical}
              priority={task.priority}
              onEdit={onEdit}
              draggable={!row.hasChildren}
              onDragStart={onBarPointerDown}
              dragging={dragging}
            />
            {dragging && (
              <div
                className={styles.dragLabel}
                role="status"
                style={{ transform: `translate(${x}px, ${top}px)` }}
              >
                {formatDate(shown.start, 'EEE d MMM')}
                {shown.finish !== shown.start && ` – ${formatDate(shown.finish, 'EEE d MMM')}`} (
                {spanWeekdays(shown)}D)
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
