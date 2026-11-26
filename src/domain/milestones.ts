import type { ISODate, Milestone } from './types';

/** A milestone, or a Milestones dialog row whose date may not be picked yet. */
type Dated = { id: string; date: ISODate | undefined };

function compareDates(a: ISODate | undefined, b: ISODate | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? -1 : 1;
}

/**
 * Earliest date first, rows without a date last. Rows on the same day, and rows without a date,
 * keep the order they're in.
 */
export function sortByDate<T extends Dated>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => compareDates(a.date, b.date));
}

/**
 * The order after row `id`'s date was picked or cleared: a row with a date goes after the other
 * rows on that day; a row without one goes to the very bottom. The other rows keep their order.
 */
export function placeByDate<T extends Dated>(rows: readonly T[], id: string): T[] {
  const row = rows.find((r) => r.id === id);
  const others = sortByDate(rows.filter((r) => r.id !== id));
  if (!row) return others;
  const { date } = row;
  const after =
    date === undefined ? -1 : others.findIndex((o) => o.date === undefined || o.date > date);
  others.splice(after === -1 ? others.length : after, 0, row);
  return others;
}

/** Whether two lists hold the same milestones in the same order (key order doesn't matter). */
export function sameMilestones(a: readonly Milestone[], b: readonly Milestone[]): boolean {
  return (
    a.length === b.length &&
    a.every((m, i) => m.id === b[i]?.id && m.name === b[i]?.name && m.date === b[i]?.date)
  );
}
