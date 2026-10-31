import { useCallback, useMemo, type KeyboardEvent } from 'react';
import { IconButton } from '../../components/Button';
import { PlusIcon } from '../../components/icons';
import { visibleTaskRows } from '../../domain/tree';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import styles from './TaskList.module.css';
import { TaskRow } from './TaskRow';

const NAME_SELECTOR = '[data-task-name], [data-add-task]';

/**
 * Arrow-key navigation between task names: ↑/↓ move, → expands, ← collapses or moves to the
 * parent. Tab still reaches every button in order.
 */
function handleListKeyDown(
  event: KeyboardEvent<HTMLUListElement>,
  setCollapsed: (id: string, collapsed: boolean) => void,
) {
  const target = event.target as HTMLElement;
  if (!target.matches(NAME_SELECTOR)) return;
  const names = [...event.currentTarget.querySelectorAll<HTMLElement>(NAME_SELECTOR)];
  const index = names.indexOf(target);
  const taskId = target.dataset.taskName;

  switch (event.key) {
    case 'ArrowDown':
      names[index + 1]?.focus();
      break;
    case 'ArrowUp':
      names[index - 1]?.focus();
      break;
    case 'Home':
      names[0]?.focus();
      break;
    case 'End':
      names.at(-1)?.focus();
      break;
    case 'ArrowRight':
      if (taskId && target.dataset.hasChildren && !target.dataset.expanded) {
        setCollapsed(taskId, false);
      }
      break;
    case 'ArrowLeft':
      if (taskId && target.dataset.expanded) setCollapsed(taskId, true);
      else if (target.dataset.parentId) {
        names.find((el) => el.dataset.taskName === target.dataset.parentId)?.focus();
      }
      break;
    default:
      return;
  }
  event.preventDefault();
}

export function TaskList() {
  const project = useProjectStore((s) => s.project);
  const setCollapsed = useProjectStore((s) => s.setCollapsed);
  const openDialog = useUiStore((s) => s.openDialog);
  const rows = useMemo(() => visibleTaskRows(project), [project]);

  const onToggle = useCallback(
    (id: string, expand: boolean) => setCollapsed(id, !expand),
    [setCollapsed],
  );
  const onEdit = useCallback(
    (taskId: string) => openDialog({ kind: 'edit-task', taskId }),
    [openDialog],
  );
  const onAddSubtask = useCallback(
    (parentId: string) => openDialog({ kind: 'add-task', parentId }),
    [openDialog],
  );
  const onDelete = useCallback(
    (taskId: string) => openDialog({ kind: 'delete-task', taskId }),
    [openDialog],
  );
  const addTask = () => openDialog({ kind: 'add-task', parentId: null });

  return (
    <div className={styles.panel}>
      <div className={styles.columnHeader} aria-hidden="true">
        Task name
      </div>
      <ul
        className={styles.list}
        aria-label="Tasks"
        onKeyDown={(e) => handleListKeyDown(e, setCollapsed)}
      >
        {rows.map((row) => {
          const task = project.tasks[row.id]!;
          return (
            <TaskRow
              key={row.id}
              id={row.id}
              name={task.name}
              parentId={task.parentId}
              depth={row.depth}
              hasChildren={row.hasChildren}
              expanded={row.expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddSubtask={onAddSubtask}
              onDelete={onDelete}
            />
          );
        })}
        <li className={`${styles.row} ${styles.addRow}`} onClick={addTask}>
          <IconButton
            label="Add task"
            className={styles.addButton}
            data-add-task=""
            onClick={(e) => {
              e.stopPropagation();
              addTask();
            }}
          >
            <PlusIcon />
          </IconButton>
        </li>
      </ul>
    </div>
  );
}
