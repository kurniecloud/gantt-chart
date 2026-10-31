import { format } from 'date-fns';
import { todayISO } from '../domain/dates';
import type { ISODate } from '../domain/types';

/**
 * A local-time `Date` at midnight on the given calendar day, for date libraries and pickers.
 * Built from parts so the day never shifts with the timezone (unlike `new Date('YYYY-MM-DD')`).
 */
export function isoToLocalDate(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** The calendar day a local-time `Date` falls on. */
export function localDateToISO(date: Date): ISODate {
  return todayISO(date);
}

/** Formats a calendar day for display, e.g. "Mon 2 Nov 2026". */
export function formatDate(date: ISODate, pattern = 'EEE d MMM yyyy'): string {
  return format(isoToLocalDate(date), pattern);
}
