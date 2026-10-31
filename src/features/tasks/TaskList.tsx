import { useCallback, useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { IconButton } from '../../components/Button';
import { PlusIcon } from '../../components/icons';
import { spanWeekdays, type EffectiveSpan } from '../../domain/taskDates';
import type { DropPlacement } from '../../domain/move';
import { childrenByParent, type TaskRow as TaskRowData } from '../../domain/tree';
import { moveTask } from '../../store/commands/taskCommands';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import styles from './TaskList.module.css';
import { TaskRow } from './TaskRow';
import { useRowDrag } from './useRowDrag';

type TaskListProps = {
  rows: TaskRowData[];
  /** Each dated task's span (parents span their subtasks), for the "(7D)" label. */
  spans: Map<string, EffectiveSpan>;
  /** The rows to draw (index into `rows`, or `rows.length` for the "+" row) and their offsets. */
  virtualRows: { index: number; top: number }[];
  /** Height of every row plus the "+" row, in px. */
  totalHeight: number;
  /** Scrolls so that the row at `index` is visible. */
  scrollToRow: (index: number) => void;
  rowHeight: number;
  /** Height of the pinned date header (for auto-scroll while dragging). */
  headerHeight: number;
};

export function TaskList({
  rows,
  spans,
  virtualRows,
  totalHeight,
  scrollToRow,
  rowHeight,
  headerHeight,
}: TaskListProps) {
  const tasks = useProjectStore((s) => s.project.tasks);
  const dispatch = useProjectStore((s) => s.dispatch);
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

  // After a keyboard move, put focus back on the moved task's name once its row is drawn again.
  const focusAfterMove = useRef<string | null>(null);
  const move = (taskId: string, placement: DropPlacement) => {
    focusAfterMove.current = taskId;
    dispatch(moveTask(taskId, placement));
  };
  const { drag, onGripPointerDown } = useRowDrag({
    rows,
    rowHeight,
    headerHeight,
    listRef,
    onDrop: (taskId, placement) => dispatch(moveTask(taskId, placement)),
  });

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

  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) focusRow(index);
    // focusRow is recreated each render; only a change of rows should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  /** Alt+Shift+arrows: move among siblings, into the row above, or out a level. */
  const keyboardMove = (taskId: string, key: string): DropPlacement | null => {
    const { project } = useProjectStore.getState();
    const parentId = project.tasks[taskId]?.parentId ?? null;
    const siblings = childrenByParent(project).get(parentId) ?? [];
    const at = siblings.indexOf(taskId);
    const previous = siblings[at - 1];
    const next = siblings[at + 1];
    if (key === 'ArrowUp' && previous) return { kind: 'before', targetId: previous };
    if (key === 'ArrowDown' && next) return { kind: 'after', targetId: next };
    if (key === 'ArrowRight' && previous) return { kind: 'last-child', targetId: previous };
    if (key === 'ArrowLeft' && parentId) return { kind: 'after', targetId: parentId };
    return null;
  };

  /** ↑/↓/Home/End move between rows, → expands, ← collapses or moves to the parent. */
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches('[data-row-focus]')) return;
    const index = Number(target.closest<HTMLElement>('[data-row-index]')?.dataset.rowIndex);
    const row = rows[index];

    if (event.altKey && event.shiftKey && event.key.startsWith('Arrow')) {
      event.preventDefault();
      const placement = row && keyboardMove(row.id, event.key);
      if (row && placement) move(row.id, placement);
      return;
    }

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
        const span = spans.get(row.id);
        return (
          <TaskRow
            key={row.id}
            id={row.id}
            name={tasks[row.id]?.name ?? ''}
            days={span ? spanWeekdays(span) : null}
            priority={tasks[row.id]?.priority}
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
            onGripPointerDown={onGripPointerDown}
            dragging={drag?.taskId === row.id}
          />
        );
      })}
      {drag?.lineTop !== undefined && (
        <li
          aria-hidden="true"
          className={styles.dropLine}
          data-invalid={drag.reason ? true : undefined}
          style={{ top: drag.lineTop, '--depth': drag.lineDepth } as CSSProperties}
        />
      )}
      {drag?.intoIndex !== undefined && (
        <li
          aria-hidden="true"
          className={styles.dropInto}
          data-invalid={drag.reason ? true : undefined}
          style={{ top: drag.intoIndex * rowHeight, height: rowHeight }}
        />
      )}
      {drag?.reason && (
        <li
          role="status"
          className={styles.dropReason}
          style={{ top: (drag.lineTop ?? (drag.intoIndex! + 1) * rowHeight) + 4 }}
        >
          {drag.reason}
        </li>
      )}
    </ul>
  );
}
