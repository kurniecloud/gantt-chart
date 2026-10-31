import type { DateSpan } from '../../domain/taskDates';
import type { ISODate, Priority } from '../../domain/types';
import { addDays } from '../../domain/dates';
import { formatDate } from '../../utils/formatDate';
import { PRIORITY_LABELS } from '../../utils/priority';

/** Daily column header, e.g. "Mon 2". */
export function dayLabel(date: ISODate): string {
  return formatDate(date, 'EEE d');
}

/** Weekly column header for the Monday–Friday week starting `monday`, e.g. "28 Sep - 2 Oct". */
export function weekLabel(monday: ISODate): string {
  return `${formatDate(monday, 'd MMM')} - ${formatDate(addDays(monday, 4), 'd MMM')}`;
}

/** Top header row, e.g. "November 2026". */
export function monthLabel(date: ISODate): string {
  return formatDate(date, 'MMMM yyyy');
}

/** Key that groups columns by month, e.g. "2026-11". */
export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

/** Tooltip and accessible name for a bar, e.g. "Design: Mon 2 Nov 2026 – Fri 6 Nov 2026 · High priority". */
export function barLabel(name: string, span: DateSpan, priority: Priority | undefined): string {
  const dates =
    span.start === span.finish
      ? formatDate(span.start)
      : `${formatDate(span.start)} – ${formatDate(span.finish)}`;
  const level = priority ? `${PRIORITY_LABELS[priority]} priority` : 'No priority';
  return `${name}: ${dates} · ${level}`;
}
