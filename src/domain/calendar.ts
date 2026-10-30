import { fromDayNumber, toDayNumber, weekday } from './dates';
import type { Calendar, ISODate } from './types';

export const STANDARD_CALENDAR_ID = 'standard';

/** Longest run of non-working days we accept before assuming the calendar is broken. */
const MAX_NON_WORKING_RUN = 3660;

export function createStandardCalendar(): Calendar {
  return {
    id: STANDARD_CALENDAR_ID,
    name: 'Standard (Mon–Fri)',
    workingWeekdays: [false, true, true, true, true, true, false],
    exceptions: [],
  };
}

// Calendars are immutable in state (immer freezes them), so the lookup can be cached per object.
const exceptionCache = new WeakMap<Calendar, Map<ISODate, boolean>>();

function exceptionsOf(calendar: Calendar): Map<ISODate, boolean> {
  let map = exceptionCache.get(calendar);
  if (!map) {
    map = new Map(calendar.exceptions.map((e) => [e.date, e.working]));
    exceptionCache.set(calendar, map);
  }
  return map;
}

export function isWorkingDay(calendar: Calendar, date: ISODate): boolean {
  const exception = exceptionsOf(calendar).get(date);
  if (exception !== undefined) return exception;
  return calendar.workingWeekdays[weekday(date)] ?? false;
}

function step(calendar: Calendar, date: ISODate, direction: 1 | -1): ISODate {
  let day = toDayNumber(date);
  for (let i = 0; i < MAX_NON_WORKING_RUN; i++) {
    day += direction;
    const candidate = fromDayNumber(day);
    if (isWorkingDay(calendar, candidate)) return candidate;
  }
  throw new Error(`Calendar "${calendar.name}" has no working days near ${date}`);
}

/** `date` itself if it is a working day, otherwise the next working day. */
export function nextWorkingDay(calendar: Calendar, date: ISODate): ISODate {
  return isWorkingDay(calendar, date) ? date : step(calendar, date, 1);
}

/** `date` itself if it is a working day, otherwise the previous working day. */
export function prevWorkingDay(calendar: Calendar, date: ISODate): ISODate {
  return isWorkingDay(calendar, date) ? date : step(calendar, date, -1);
}

/**
 * Moves `n` working days from `date`: forward when n > 0, backward when n < 0.
 * n = 0 returns `nextWorkingDay(date)`.
 */
export function addWorkingDays(calendar: Calendar, date: ISODate, n: number): ISODate {
  if (!Number.isInteger(n)) throw new Error(`Working-day offset must be an integer, got ${n}`);
  if (n === 0) return nextWorkingDay(calendar, date);
  const direction = n > 0 ? 1 : -1;
  let current = date;
  for (let i = 0; i < Math.abs(n); i++) current = step(calendar, current, direction);
  return current;
}

/** Inclusive finish for a task starting on `start`. Milestones (0 days) finish on `start`. */
export function finishFromStart(calendar: Calendar, start: ISODate, durationDays: number): ISODate {
  if (durationDays <= 0) return start;
  return addWorkingDays(calendar, nextWorkingDay(calendar, start), durationDays - 1);
}

/** Inverse of `finishFromStart`. */
export function startFromFinish(
  calendar: Calendar,
  finish: ISODate,
  durationDays: number,
): ISODate {
  if (durationDays <= 0) return finish;
  const last = prevWorkingDay(calendar, finish);
  return durationDays === 1 ? last : addWorkingDays(calendar, last, -(durationDays - 1));
}

/** Inclusive count of working days in [a, b]; 0 when b is before a. */
export function workingDaysBetween(calendar: Calendar, a: ISODate, b: ISODate): number {
  const from = toDayNumber(a);
  const to = toDayNumber(b);
  let count = 0;
  for (let day = from; day <= to; day++) {
    if (isWorkingDay(calendar, fromDayNumber(day))) count++;
  }
  return count;
}
