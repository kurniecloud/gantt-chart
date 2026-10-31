import { useCallback, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { IconButton } from '../../components/Button';
import { PlusIcon } from '../../components/icons';
import type { TaskRow as TaskRowData } from '../../domain/tree';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import styles from './TaskList.module.css';
import { TaskRow } from './TaskRow';

type TaskListProps = {
  rows: TaskRowData[];
  /** The rows to draw (index into `rows`, or `rows.length` for the "+" row) and their offsets. */
  virtualRows: { index: number; top: number }[];
  /** Height of every row plus the "+" row, in px. */
  totalHeight: number;
  /** Scrolls so that the row at `index` is visible. */
  scrollToRow: (index: number) => void;
};

export function TaskList({ rows, virtualRows, totalHeight, scrollToRow }: TaskListProps) {
  const tasks = useProjectStore((s) => s.project.tasks);
  const setCollapsed = useProjectStore((s) => s.setCollapsed);
  const openDialog = useUiStore((s) => s.openDialog);
  const listRef = useRef<HTMLUListElement>(null);
  const setSize = rows.length + 1;

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

  /** Focuses a row's name, scrolling it into view first — it may not be drawn yet. */
  const focusRow = (index: number) => {
    scrollToRow(index);
    const attempt = (triesLeft: number) => {
      const el = listRef.current?.querySelector<HTMLElement>(
        `[data-row-index="${index}"] [data-row-focus]`,
      );
      if (el) el.focus({ preventScroll: true });
      else if (triesLeft > 0) requestAnimationFrame(() => attempt(triesLeft - 1));
    };
    attempt(5);
  };

  /** ↑/↓/Home/End move between rows, → expands, ← collapses or moves to the parent. */
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches('[data-row-focus]')) return;
    const index = Number(target.closest<HTMLElement>('[data-row-index]')?.dataset.rowIndex);
    const row = rows[index];

    switch (event.key) {
      case 'ArrowDown':
        if (index < rows.length) focusRow(index + 1);
        break;
      case 'ArrowUp':
        if (index > 0) focusRow(index - 1);
        break;
      case 'Home':
        focusRow(0);
        break;
      case 'End':
        focusRow(rows.length);
        break;
      case 'ArrowRight':
        if (row?.hasChildren && !row.expanded) setCollapsed(row.id, false);
        break;
      case 'ArrowLeft': {
        if (!row) break;
        if (row.expanded) setCollapsed(row.id, true);
        else {
          const parentId = tasks[row.id]?.parentId;
          const parentIndex = rows.findIndex((r) => r.id === parentId);
          if (parentIndex >= 0) focusRow(parentIndex);
        }
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <ul
      ref={listRef}
      className={styles.list}
      aria-label="Tasks"
      style={{ height: totalHeight }}
      onKeyDown={onKeyDown}
    >
      {virtualRows.map(({ index, top }) => {
        const row = rows[index];
        if (!row) {
          return (
            <li
              key="add-task"
              className={`${styles.row} ${styles.addRow}`}
              aria-posinset={index + 1}
              aria-setsize={setSize}
              data-row-index={index}
              style={{ transform: `translateY(${top}px)` } as CSSProperties}
              onClick={addTask}
            >
              <IconButton
                label="Add task"
                className={styles.addButton}
                data-row-focus=""
                onClick={(e) => {
                  e.stopPropagation();
                  addTask();
                }}
              >
                <PlusIcon />
              </IconButton>
            </li>
          );
        }
        return (
          <TaskRow
            key={row.id}
            id={row.id}
            name={tasks[row.id]?.name ?? ''}
            index={index}
            setSize={setSize}
            top={top}
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
    </ul>
  );
}
