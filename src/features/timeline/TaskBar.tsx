import { memo, type CSSProperties } from 'react';
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
  priority: Priority | undefined;
  onEdit: (id: string) => void;
};

export const TaskBar = memo(function TaskBar({
  id,
  label,
  x,
  width,
  top,
  summary,
  priority,
  onEdit,
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
      style={
        {
          '--bar-color': priorityColorVar(priority),
          transform: `translate(${x}px, ${top}px)`,
          width,
        } as CSSProperties
      }
      onClick={() => onEdit(id)}
    />
  );
});
