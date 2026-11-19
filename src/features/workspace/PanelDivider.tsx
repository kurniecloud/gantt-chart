import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { MIN_PANEL_WIDTH, clampPanelWidth, panelWidthForKey } from './panelWidth';
import styles from './Workspace.module.css';

type PanelDividerProps = {
  /** The width shown now (already within the limits). */
  width: number;
  max: number;
  /** Called on every move while dragging. */
  onDrag: (width: number) => void;
  /** A finished change (drag released, key, double-click): becomes the remembered width. */
  onChange: (width: number) => void;
};

/**
 * The line between the task panel and the timeline. Drag it, double-click it to go back to the
 * narrowest width, or focus it and use ←/→ (Shift for bigger steps) and Home/End.
 */
export function PanelDivider({ width, max, onDrag, onChange }: PanelDividerProps) {
  const [dragging, setDragging] = useState(false);
  const stopDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => stopDrag.current?.(), []);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // No text selection while dragging; this also skips the mouse-down focus, so focus here.
    event.preventDefault();
    event.currentTarget.focus();
    const startX = event.clientX;
    const startWidth = width;
    let latest = width;

    const onMove = (e: PointerEvent) => {
      latest = clampPanelWidth(startWidth + e.clientX - startX, max);
      onDrag(latest);
    };
    const finish = (result: number) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      delete document.body.dataset.dragging;
      stopDrag.current = null;
      setDragging(false);
      onChange(result);
    };
    const onUp = () => finish(latest);
    const onCancel = () => finish(startWidth);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    document.body.dataset.dragging = 'panel';
    stopDrag.current = () => finish(latest);
    setDragging(true);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Task Panel"
      aria-valuenow={width}
      aria-valuemin={MIN_PANEL_WIDTH}
      aria-valuemax={max}
      aria-valuetext={`${width} pixels wide`}
      tabIndex={0}
      title="Drag to resize the task panel; double-click to reset it"
      className={styles.divider}
      data-dragging={dragging || undefined}
      onPointerDown={startDrag}
      onDoubleClick={() => onChange(MIN_PANEL_WIDTH)}
      onKeyDown={(event) => {
        const next = panelWidthForKey(event.key, event.shiftKey, width, max);
        if (next === null) return;
        event.preventDefault();
        onChange(next);
      }}
    />
  );
}
