import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button } from '../../components/Button';
import { FlagIcon } from '../../components/icons';
import { criticalPath } from '../../domain/criticalPath';
import { todayISO } from '../../domain/dates';
import { effectiveSpans } from '../../domain/taskDates';
import { visibleTaskRows } from '../../domain/tree';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { useViewStore } from '../../store/viewStore';
import { TaskList } from '../tasks/TaskList';
import { TimelineBody } from '../timeline/TimelineBody';
import { TimelineHeader } from '../timeline/TimelineHeader';
import { TimelineToolbar } from '../timeline/TimelineToolbar';
import { milestoneMarks } from '../timeline/labels';
import {
  columnOfDate,
  createScale,
  dateAtX,
  dayRange,
  initialColumn,
  todayColumn,
  type TimelineScale,
} from '../timeline/scale';
import styles from './Workspace.module.css';

export const ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 56;
const TASK_PANEL_WIDTH = 320;
const TASK_PANEL_WIDTH_PHONE = 196;
const PHONE_QUERY = '(max-width: 720px)';
/** Assumed viewport until the scroll area is measured, so the first paint isn't empty. */
const INITIAL_RECT = { width: 1024, height: 768 };

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

function useTaskPanelWidth(): number {
  const [isPhone, setIsPhone] = useState(() => matches(PHONE_QUERY));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return isPhone ? TASK_PANEL_WIDTH_PHONE : TASK_PANEL_WIDTH;
}

/**
 * The task list and the timeline in one scroll area: the list is pinned on the left and the date
 * header at the top (CSS sticky), so rows always line up and only one scroll position exists.
 * Rows and date columns are virtualized — only what's on screen is drawn.
 */
export function Workspace() {
  const project = useProjectStore((s) => s.project);
  const mode = useViewStore((s) => s.mode);
  const showCriticalPath = useViewStore((s) => s.showCriticalPath);
  const openDialog = useUiStore((s) => s.openDialog);
  const [today] = useState(todayISO);
  const panelWidth = useTaskPanelWidth();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => visibleTaskRows(project), [project]);
  const spans = useMemo(() => effectiveSpans(project), [project]);
  const scale = useMemo(() => createScale(mode, today), [mode, today]);
  const highlighted = todayColumn(scale, today);
  const todaySlot = dayRange(scale, today);
  const milestones = useMemo(
    () => milestoneMarks(scale, project.milestones),
    [scale, project.milestones],
  );
  // Recalculated on every change while the toggle is on.
  const critical = useMemo(
    () => (showCriticalPath ? criticalPath(project) : null),
    [showCriticalPath, project],
  );
  const criticalCount = critical
    ? [...critical.slack.values()].filter((slack) => slack <= 0).length
    : null;
  const rowsHeight = (rows.length + 1) * ROW_HEIGHT; // + the "+" row

  // The project doesn't use the React Compiler, so this hook not being memoizable doesn't matter.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rows.length + 1,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    scrollMargin: HEADER_HEIGHT,
    scrollPaddingStart: HEADER_HEIGHT,
    initialRect: INITIAL_RECT,
  });
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: scale.columnCount,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => scale.columnWidth,
    overscan: 3,
    scrollMargin: panelWidth,
    initialRect: INITIAL_RECT,
  });

  // Column widths change with the view; drop the virtualizer's cached sizes.
  useLayoutEffect(() => {
    columnVirtualizer.measure();
  }, [columnVirtualizer, scale]);

  // Open on today; when switching views, keep the same dates in view.
  const previousScale = useRef<TimelineScale | null>(null);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const previous = previousScale.current;
    const column =
      previous && previous !== scale
        ? columnOfDate(scale, dateAtX(previous, scroller.scrollLeft))
        : initialColumn(scale, today);
    scroller.scrollTo({ left: column * scale.columnWidth });
    previousScale.current = scale;
  }, [scale, today]);

  const scrollToToday = () => {
    scrollerRef.current?.scrollTo({
      left: initialColumn(scale, today) * scale.columnWidth,
      behavior: matches('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth',
    });
  };

  const virtualRows = rowVirtualizer
    .getVirtualItems()
    .map((item) => ({ index: item.index, top: item.start - HEADER_HEIGHT }));
  const columns = columnVirtualizer.getVirtualItems().map((item) => item.index);

  return (
    <div
      className={styles.workspace}
      style={
        {
          '--task-panel-width': `${panelWidth}px`,
          '--timeline-width': `${scale.totalWidth}px`,
          '--header-height': `${HEADER_HEIGHT}px`,
          '--row-height': `${ROW_HEIGHT}px`,
          '--rows-height': `${rowsHeight}px`,
        } as CSSProperties
      }
    >
      <div className={styles.toolbarRow}>
        <div className={styles.panelTools}>
          <Button onClick={() => openDialog({ kind: 'milestones' })}>
            <FlagIcon />
            Milestones
          </Button>
        </div>
        <TimelineToolbar onToday={scrollToToday} criticalCount={criticalCount} />
      </div>
      <div ref={scrollerRef} className={styles.scroller} data-testid="workspace-scroller">
        <div className={styles.grid}>
          <div className={styles.corner} aria-hidden="true">
            Task name
          </div>
          <div className={styles.timelineHeader}>
            <TimelineHeader
              scale={scale}
              columns={columns}
              todayColumn={highlighted}
              todaySlot={todaySlot}
              milestones={milestones}
            />
          </div>
          <div className={styles.taskColumn}>
            <TaskList
              rows={rows}
              spans={spans}
              virtualRows={virtualRows}
              totalHeight={rowsHeight}
              scrollToRow={(index) => rowVirtualizer.scrollToIndex(index)}
            />
          </div>
          <div className={styles.timelineBody}>
            <TimelineBody
              scale={scale}
              rows={rows}
              tasks={project.tasks}
              spans={spans}
              virtualRows={virtualRows}
              rowsHeight={rowsHeight}
              todaySlot={todaySlot}
              milestones={milestones}
              criticalIds={critical?.criticalIds ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
