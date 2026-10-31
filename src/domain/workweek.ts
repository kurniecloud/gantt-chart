import { addDays, fromDayNumber, toDayNumber, weekday } from './dates';
import type { ISODate } from './types';

// The timeline shows Monday–Friday only. These helpers give every weekday a consecutive
// "weekday index", which is the timeline's x coordinate before scaling.

/** Day number of Monday 1970-01-05, the first Monday after the epoch. */
const EPOCH_MONDAY = 4;

export function isWeekend(date: ISODate): boolean {
  const day = weekday(date);
  return day === 0 || day === 6;
}

/** `date` itself on a weekday, otherwise the following Monday. */
export function nextWeekday(date: ISODate): ISODate {
  const day = weekday(date);
  return day === 6 ? addDays(date, 2) : day === 0 ? addDays(date, 1) : date;
}

/** `date` itself on a weekday, otherwise the preceding Friday. */
export function previousWeekday(date: ISODate): ISODate {
  const day = weekday(date);
  return day === 6 ? addDays(date, -1) : day === 0 ? addDays(date, -2) : date;
}

/** Weekdays since Monday 1970-01-05 (negative before it). Weekend dates map to the next Monday. */
export function weekdayIndex(date: ISODate): number {
  const offset = toDayNumber(date) - EPOCH_MONDAY;
  const week = Math.floor(offset / 7);
  const dayInWeek = offset - week * 7; // 0 = Monday … 6 = Sunday
  return week * 5 + Math.min(dayInWeek, 5);
}

export function fromWeekdayIndex(index: number): ISODate {
  const week = Math.floor(index / 5);
  return fromDayNumber(EPOCH_MONDAY + week * 7 + (index - week * 5));
}

/** Monday of the Monday–Sunday week containing `date`. */
export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -((weekday(date) + 6) % 7));
}
