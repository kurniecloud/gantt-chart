import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { planMove, type DropPlacement } from '../../domain/move';
import type { TaskRow } from '../../domain/tree';
import { useProjectStore } from '../../store/projectStore';

export type RowDrag = {
  taskId: string;
  placement: DropPlacement;
  /** A line between rows (`lineTop`, indented to `lineDepth`) or a highlighted row (`intoIndex`). */
  lineTop?: number;
  lineDepth?: number;
  intoIndex?: number;
  /** Set when the drop isn't allowed, with the reason. */
  reason?: string;
};

type Options = {
  rows: TaskRow[];
  rowHeight: number;
  /** Height of the pinned header above the rows (auto-scroll starts below it). */
  headerHeight: number;
  listRef: RefObject<HTMLUListElement | null>;
  onDrop: (taskId: string, placement: DropPlacement) => void;
};

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 4;
/** Distance from the scroll area's top/bottom edge where the list starts scrolling. */
const SCROLL_ZONE = 32;

/**
 * Dragging a task row by its grip: top quarter of a row → above it, bottom quarter → below it
 * (an expanded parent's first subtask), middle → its last subtask, the "+" row → end of the
 * list. Uses pointer events on the window so it works with mouse, pen and touch, and keeps
 * working if the dragged row scrolls out of the (virtualized) list.
 */
export function useRowDrag({ rows, rowHeight, headerHeight, listRef, onDrop }: Options) {
  const [drag, setDrag] = useState<RowDrag | null>(null);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const onGripPointerDown = (taskId: string, event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    let lastY = startY;
    let started = false;
    let current: RowDrag | null = null;
    let frame = 0;

    const measure = (clientY: number): RowDrag | null => {
      const list = listRef.current;
      if (!list) return null;
      const rowsNow = rowsRef.current;
      const y = clientY - list.getBoundingClientRect().top;
      const index = Math.min(Math.max(Math.floor(y / rowHeight), 0), rowsNow.length);
      const row = rowsNow[index];
      let next: Omit<RowDrag, 'reason'>;
      if (!row) {
        next = { taskId, placement: { kind: 'end' }, lineTop: index * rowHeight, lineDepth: 0 };
      } else {
        const ratio = (y - index * rowHeight) / rowHeight;
        if (ratio < 0.25) {
          next = {
            taskId,
            placement: { kind: 'before', targetId: row.id },
            lineTop: index * rowHeight,
            lineDepth: row.depth,
          };
        } else if (ratio > 0.75) {
          next = {
            taskId,
            placement: { kind: row.expanded ? 'first-child' : 'after', targetId: row.id },
            lineTop: (index + 1) * rowHeight,
            lineDepth: row.depth + (row.expanded ? 1 : 0),
          };
        } else {
          next = { taskId, placement: { kind: 'last-child', targetId: row.id }, intoIndex: index };
        }
      }
      const plan = planMove(useProjectStore.getState().project, taskId, next.placement);
      return plan.ok ? next : { ...next, reason: plan.reason };
    };

    const update = () => {
      current = measure(lastY);
      setDrag(current);
    };

    // While dragging near the top/bottom edge, keep scrolling and re-measuring.
    const autoScroll = () => {
      const scroller = listRef.current?.closest<HTMLElement>('[data-testid="workspace-scroller"]');
      if (scroller) {
        const box = scroller.getBoundingClientRect();
        const step =
          lastY < box.top + headerHeight + SCROLL_ZONE
            ? -10
            : lastY > box.bottom - SCROLL_ZONE
              ? 10
              : 0;
        if (step !== 0) {
          scroller.scrollTop += step;
          update();
        }
      }
      frame = requestAnimationFrame(autoScroll);
    };

    const onMove = (e: PointerEvent) => {
      lastY = e.clientY;
      if (!started) {
        if (Math.abs(lastY - startY) < DRAG_THRESHOLD) return;
        started = true;
        document.body.dataset.dragging = 'row';
        frame = requestAnimationFrame(autoScroll);
      }
      update();
    };

    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      cancelAnimationFrame(frame);
      delete document.body.dataset.dragging;
      setDrag(null);
      if (commit && started && current && !current.reason) onDrop(taskId, current.placement);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
  };

  return { drag, onGripPointerDown };
}
