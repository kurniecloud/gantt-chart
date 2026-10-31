import { useCallback, type CSSProperties } from 'react';
import type { EffectiveSpan } from '../../domain/taskDates';
import type { TaskRow } from '../../domain/tree';
import type { Task } from '../../domain/types';
import { useUiStore } from '../../store/uiStore';
import type { DependencyArrow } from './arrows';
import { DependencyArrows } from './DependencyArrows';
import { barLabel, type MilestoneMark } from './labels';
import { barGeometry, type TimelineScale } from './scale';
import { TaskBar } from './TaskBar';
import styles from './Timeline.module.css';

type TimelineBodyProps = {
  scale: TimelineScale;
  rows: TaskRow[];
  tasks: Record<string, Task>;
  spans: Map<string, EffectiveSpan>;
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
  virtualRows,
  rowsHeight,
  todaySlot,
  milestones,
  criticalIds,
  arrows,
  rowHeight,
}: TimelineBodyProps) {
  const openDialog = useUiStore((s) => s.openDialog);
  const onEdit = useCallback(
    (taskId: string) => openDialog({ kind: 'edit-task', taskId }),
    [openDialog],
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
        const span = row && spans.get(row.id);
        const task = row && tasks[row.id];
        if (!row || !span || !task) return null;
        const { x, width } = barGeometry(scale, span);
        const critical = criticalIds?.has(row.id) ?? false;
        return (
          <TaskBar
            key={row.id}
            id={row.id}
            label={barLabel(task.name, span, task.priority, critical)}
            x={x}
            width={width}
            top={top}
            summary={row.hasChildren}
            critical={critical}
            priority={task.priority}
            onEdit={onEdit}
          />
        );
      })}
    </div>
  );
}
