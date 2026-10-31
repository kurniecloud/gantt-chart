import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { DragMode } from '../../domain/taskDates';

export type BarDrag = { taskId: string; mode: DragMode; delta: number };

/** Pixels the pointer must travel before a press on a bar becomes a drag (otherwise: a click). */
const DRAG_THRESHOLD = 4;

/**
 * Dragging a bar sideways: the body moves the task, the edge handles resize it. Snaps to whole
 * weekdays (`dayWidth` px each). Esc cancels. `wasDrag()` tells the click handler to ignore the
 * click that follows a drag.
 */
export function useBarDrag(
  dayWidth: number,
  onCommit: (taskId: string, mode: DragMode, delta: number) => void,
) {
  const [drag, setDrag] = useState<BarDrag | null>(null);
  const suppressClick = useRef(false);

  const onBarPointerDown = (taskId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const handle = (event.target as HTMLElement).dataset.handle;
    const mode: DragMode = handle === 'start' || handle === 'end' ? handle : 'move';
    const originX = event.clientX;
    let delta = 0;
    let started = false;
    let shown = false;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - originX;
      if (!started) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        started = true;
        document.body.dataset.dragging = mode === 'move' ? 'bar' : 'bar-resize';
      }
      const next = Math.round(dx / dayWidth);
      if (next !== delta || !shown) {
        shown = true;
        delta = next;
        setDrag({ taskId, mode, delta });
      }
    };
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      delete document.body.dataset.dragging;
      setDrag(null);
      if (!started) return;
      // The click that follows pointerup must not open the edit dialog.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      if (commit && delta !== 0) onCommit(taskId, mode, delta);
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

  const wasDrag = useCallback(() => suppressClick.current, []);
  return { drag, onBarPointerDown, wasDrag };
}
