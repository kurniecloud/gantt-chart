import { format } from 'date-fns';
import type { ISODate } from '../domain/types';

/** Formats a calendar day for display, e.g. "Mon 2 Nov 2026". */
export function formatDate(date: ISODate, pattern = 'EEE d MMM yyyy'): string {
  const [y, m, d] = date.split('-').map(Number);
  // Built from parts in local time so the displayed day never shifts with the timezone.
  return format(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1), pattern);
}

export function formatDuration(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}
