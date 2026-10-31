import { memo, type CSSProperties, type MouseEvent } from 'react';
import { IconButton } from '../../components/Button';
import { ChevronRightIcon, CirclePlusIcon, CrossIcon } from '../../components/icons';
import styles from './TaskList.module.css';

type TaskRowProps = {
  id: string;
  name: string;
  parentId: string | null;
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
  parentId,
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
      style={{ '--depth': depth } as CSSProperties}
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
        data-task-name={id}
        data-parent-id={parentId ?? undefined}
        data-has-children={hasChildren || undefined}
        data-expanded={expanded || undefined}
        onClick={stop(() => onEdit(id))}
      >
        {name}
      </button>
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
