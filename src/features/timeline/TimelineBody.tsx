import { useCallback, type CSSProperties } from 'react';
import type { EffectiveSpan } from '../../domain/taskDates';
import type { TaskRow } from '../../domain/tree';
import type { Task } from '../../domain/types';
import { useUiStore } from '../../store/uiStore';
import { barLabel } from './labels';
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
  todayColumn: number | null;
};

export function TimelineBody({
  scale,
  rows,
  tasks,
  spans,
  virtualRows,
  rowsHeight,
  todayColumn,
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
      <div className={styles.rowLines} style={{ height: rowsHeight }} />
      {todayColumn !== null && (
        <div
          className={styles.todayColumn}
          data-testid="today-column"
          style={{ left: todayColumn * scale.columnWidth, width: scale.columnWidth }}
        />
      )}
      {virtualRows.map(({ index, top }) => {
        const row = rows[index];
        const span = row && spans.get(row.id);
        const task = row && tasks[row.id];
        if (!row || !span || !task) return null;
        const { x, width } = barGeometry(scale, span);
        return (
          <TaskBar
            key={row.id}
            id={row.id}
            label={barLabel(task.name, span, task.priority)}
            x={x}
            width={width}
            top={top}
            summary={row.hasChildren}
            priority={task.priority}
            onEdit={onEdit}
          />
        );
      })}
    </div>
  );
}
