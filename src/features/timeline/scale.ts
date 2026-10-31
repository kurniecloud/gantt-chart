import { addDays } from '../../domain/dates';
import type { DateSpan } from '../../domain/taskDates';
import type { ISODate } from '../../domain/types';
import {
  fromWeekdayIndex,
  isWeekend,
  nextWeekday,
  previousWeekday,
  startOfWeek,
  weekdayIndex,
} from '../../domain/workweek';
import type { ViewMode } from '../../store/viewStore';

// Pure geometry for the timeline. x = 0 is the left edge of column 0. Weekends don't exist on
// this axis: x advances one `dayWidth` per weekday (see domain/workweek.ts).

export const DAY_WIDTH = 48;
export const WEEK_WIDTH = DAY_WIDTH * 3;
export const YEARS_EACH_WAY = 10;

export type TimelineScale = {
  mode: ViewMode;
  /** Weekday index of column 0 — always a Monday. */
  originIndex: number;
  columnCount: number;
  columnWidth: number;
  /** Width of one weekday: a whole column in daily view, a fifth of one in weekly view. */
  dayWidth: number;
  totalWidth: number;
};

export function createScale(
  mode: ViewMode,
  today: ISODate,
  yearsEachWay = YEARS_EACH_WAY,
): TimelineScale {
  const days = Math.round(365.25 * yearsEachWay);
  const originIndex = weekdayIndex(startOfWeek(addDays(today, -days)));
  const lastIndex = weekdayIndex(previousWeekday(addDays(today, days)));
  const weekdays = lastIndex - originIndex + 1;
  const columnWidth = mode === 'daily' ? DAY_WIDTH : WEEK_WIDTH;
  const columnCount = mode === 'daily' ? weekdays : Math.ceil(weekdays / 5);
  return {
    mode,
    originIndex,
    columnCount,
    columnWidth,
    dayWidth: mode === 'daily' ? DAY_WIDTH : WEEK_WIDTH / 5,
    totalWidth: columnCount * columnWidth,
  };
}

function clampColumn(scale: TimelineScale, column: number): number {
  return Math.min(Math.max(column, 0), scale.columnCount - 1);
}

/** The column a date falls in. A weekend date belongs to the week it ends (weekly) or the next Monday (daily). */
export function columnOfDate(scale: TimelineScale, date: ISODate): number {
  const column =
    scale.mode === 'daily'
      ? weekdayIndex(date) - scale.originIndex
      : (weekdayIndex(startOfWeek(date)) - scale.originIndex) / 5;
  return clampColumn(scale, column);
}

/** First day shown in a column: the day itself (daily) or that week's Monday (weekly). */
export function columnStartDate(scale: TimelineScale, column: number): ISODate {
  const step = scale.mode === 'daily' ? 1 : 5;
  return fromWeekdayIndex(scale.originIndex + column * step);
}

/** The weekday at a horizontal position. */
export function dateAtX(scale: TimelineScale, x: number): ISODate {
  const maxDay = scale.totalWidth / scale.dayWidth - 1;
  const day = Math.min(Math.max(Math.floor(x / scale.dayWidth), 0), maxDay);
  return fromWeekdayIndex(scale.originIndex + day);
}

/**
 * Where a task's bar goes. Weekend ends are trimmed to the weekdays inside the span; a span with
 * no weekdays at all gets zero width (drawn as a thin marker).
 */
export function barGeometry(scale: TimelineScale, span: DateSpan): { x: number; width: number } {
  const first = weekdayIndex(nextWeekday(span.start));
  const last = weekdayIndex(previousWeekday(span.finish));
  return {
    x: (first - scale.originIndex) * scale.dayWidth,
    width: Math.max(last - first + 1, 0) * scale.dayWidth,
  };
}

/** The column to highlight as "today", or null when today is a weekend in daily view. */
export function todayColumn(scale: TimelineScale, today: ISODate): number | null {
  if (scale.mode === 'daily' && isWeekend(today)) return null;
  return columnOfDate(scale, today);
}

/** The column the timeline opens on: today, or the next Monday on a weekend (daily view). */
export function initialColumn(scale: TimelineScale, today: ISODate): number {
  return columnOfDate(scale, scale.mode === 'daily' ? nextWeekday(today) : today);
}
