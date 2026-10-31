import { memo, type CSSProperties, type MouseEvent } from 'react';
import { IconButton } from '../../components/Button';
import { ChevronRightIcon, CirclePlusIcon, CrossIcon } from '../../components/icons';
import type { Priority } from '../../domain/types';
import { priorityTextColorVar } from '../../utils/priority';
import styles from './TaskList.module.css';

type TaskRowProps = {
  id: string;
  name: string;
  /** Weekdays the task spans, or null when it has no dates. */
  days: number | null;
  priority: Priority | undefined;
  /** Position in the visible list (0-based) and how many rows the list has, for screen readers. */
  index: number;
  setSize: number;
  /** Offset from the top of the list, in px (rows are virtualized). */
  top: number;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: (id: string, expand: boolean) => void;
  onEdit: (id: string) => void;
  onAddSubtask: (id: string) => void;
  onDelete: (id: string) => void;
};

function stop(action: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    action();
  };
}

export const TaskRow = memo(function TaskRow({
  id,
  name,
  days,
  priority,
  index,
  setSize,
  top,
  depth,
  hasChildren,
  expanded,
  onToggle,
  onEdit,
  onAddSubtask,
  onDelete,
}: TaskRowProps) {
  return (
    <li
      className={styles.row}
      aria-level={depth + 1}
      aria-posinset={index + 1}
      aria-setsize={setSize}
      data-row-index={index}
      style={{ '--depth': depth, transform: `translateY(${top}px)` } as CSSProperties}
      onClick={() => onEdit(id)}
    >
      {hasChildren ? (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name}`}
          onClick={stop(() => onToggle(id, !expanded))}
        >
          <ChevronRightIcon />
        </button>
      ) : (
        <span className={styles.toggleSpacer} />
      )}
      <button
        type="button"
        className={styles.name}
        title={name}
        data-row-focus=""
        data-task-name={id}
        onClick={stop(() => onEdit(id))}
      >
        {name}
      </button>
      {days !== null && (
        <span className={styles.days} style={{ color: priorityTextColorVar(priority) }}>
          <span aria-hidden="true">({days}D)</span>
          <span className="visually-hidden">
            {days} {days === 1 ? 'weekday' : 'weekdays'}
          </span>
        </span>
      )}
      <span className={styles.actions}>
        <IconButton label={`Add subtask to ${name}`} onClick={stop(() => onAddSubtask(id))}>
          <CirclePlusIcon />
        </IconButton>
        <IconButton label={`Delete ${name}`} tone="danger" onClick={stop(() => onDelete(id))}>
          <CrossIcon />
        </IconButton>
      </span>
    </li>
  );
});
