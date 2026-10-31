import { addDays } from '../../domain/dates';
import type { DateSpan } from '../../domain/taskDates';
import type { ISODate, Milestone, Priority } from '../../domain/types';
import { formatDate } from '../../utils/formatDate';
import { PRIORITY_LABELS } from '../../utils/priority';
import { dayRange, type TimelineScale } from './scale';

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
export function barLabel(
  name: string,
  span: DateSpan,
  priority: Priority | undefined,
  critical = false,
): string {
  const dates =
    span.start === span.finish
      ? formatDate(span.start)
      : `${formatDate(span.start)} – ${formatDate(span.finish)}`;
  const level = priority ? `${PRIORITY_LABELS[priority]} priority` : 'No priority';
  return `${name}: ${dates} · ${level}${critical ? ' · Critical' : ''}`;
}

export type MilestoneMark = {
  date: ISODate;
  x: number;
  width: number;
  /** e.g. "Milestone: Design sign-off — Fri 13 Nov 2026" (names joined if several share a day). */
  label: string;
};

/** One highlighted day per milestone date (weekend dates can't be shown and are skipped). */
export function milestoneMarks(scale: TimelineScale, milestones: Milestone[]): MilestoneMark[] {
  const byDate = new Map<ISODate, string[]>();
  for (const milestone of milestones) {
    byDate.set(milestone.date, [...(byDate.get(milestone.date) ?? []), milestone.name]);
  }
  const marks: MilestoneMark[] = [];
  for (const [date, names] of byDate) {
    const slot = dayRange(scale, date);
    if (!slot) continue;
    const noun = names.length === 1 ? 'Milestone' : 'Milestones';
    marks.push({ date, ...slot, label: `${noun}: ${names.join(', ')} — ${formatDate(date)}` });
  }
  return marks;
}

/** Tooltip for the actual-dates line, e.g. "Actual: Mon 2 Nov 2026 – Wed 4 Nov 2026 (in progress)". */
export function actualLabel(span: DateSpan, inProgress: boolean): string {
  const dates =
    span.start === span.finish
      ? formatDate(span.start)
      : `${formatDate(span.start)} – ${formatDate(span.finish)}`;
  return `Actual: ${dates}${inProgress ? ' (in progress)' : ''}`;
}
