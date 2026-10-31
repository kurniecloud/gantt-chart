import { memo, type CSSProperties, type PointerEvent } from 'react';
import type { Priority } from '../../domain/types';
import { priorityColorVar } from '../../utils/priority';
import styles from './Timeline.module.css';

type TaskBarProps = {
  id: string;
  /** Tooltip and accessible name: task, dates and priority. */
  label: string;
  x: number;
  width: number;
  /** Row offset from the top of the timeline body, in px. */
  top: number;
  /** Parents are drawn as a thinner bracket spanning their subtasks. */
  summary: boolean;
  /** On the critical path: a red line through the middle of the bar. */
  critical: boolean;
  priority: Priority | undefined;
  onEdit: (id: string) => void;
  /** Tasks without subtasks can be dragged (move) and resized (edge handles). */
  draggable: boolean;
  onDragStart: (id: string, event: PointerEvent<HTMLElement>) => void;
  /** Being dragged right now. */
  dragging: boolean;
};

export const TaskBar = memo(function TaskBar({
  id,
  label,
  x,
  width,
  top,
  summary,
  critical,
  priority,
  onEdit,
  draggable,
  onDragStart,
  dragging,
}: TaskBarProps) {
  return (
    <button
      type="button"
      // The task list is the keyboard path to editing; keep bars out of the tab order.
      tabIndex={-1}
      className={summary ? styles.summaryBar : styles.bar}
      aria-label={label}
      title={label}
      data-task-id={id}
      data-priority={priority ?? 'none'}
      data-critical={critical || undefined}
      data-draggable={draggable || undefined}
      data-dragging={dragging || undefined}
      style={
        {
          '--bar-color': priorityColorVar(priority),
          transform: `translate(${x}px, ${top}px)`,
          width,
        } as CSSProperties
      }
      onPointerDown={draggable ? (event) => onDragStart(id, event) : undefined}
      onClick={() => onEdit(id)}
    >
      {draggable && (
        <>
          <span className={styles.handleStart} data-handle="start" />
          <span className={styles.handleEnd} data-handle="end" />
        </>
      )}
    </button>
  );
});
