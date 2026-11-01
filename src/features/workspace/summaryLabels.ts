import type { MilestoneSummary, ProjectLength, ProjectSummary } from '../../domain/summary';
import { formatDate } from '../../utils/formatDate';

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Tooltip for the task count, e.g. "5 Main Tasks, 10 Edge Tasks (Without Subtasks)". */
export function taskCountTitle({ mainTaskCount, edgeTaskCount }: ProjectSummary): string {
  return `${plural(mainTaskCount, 'Main Task')}, ${plural(edgeTaskCount, 'Edge Task')} (Without Subtasks)`;
}

/** The figure shown for a length, e.g. "45D", or "—" when there are no dates. */
export function lengthLabel(length: ProjectLength | null): string {
  return length ? `${length.days}D` : '—';
}

/** Tooltip, e.g. "Planned: Mon 2 Nov 2026 – Fri 1 Jan 2027 (45 Weekdays)". */
export function lengthTitle(
  kind: 'Planned' | 'Actual',
  length: ProjectLength | null,
  inProgress = false,
): string {
  if (!length) return `${kind}: No ${kind === 'Actual' ? 'Actual ' : ''}Dates Yet`;
  const dates =
    length.start === length.finish
      ? formatDate(length.start)
      : `${formatDate(length.start)} – ${formatDate(length.finish)}`;
  return `${kind}: ${dates} (${plural(length.days, 'Weekday')}${inProgress ? ', In Progress' : ''})`;
}

/** e.g. "5 Milestones · 3 Upcoming", "3 Milestones · All Passed", "No Milestones". */
export function milestoneSummaryLabel({ total, upcoming }: MilestoneSummary): string {
  if (total === 0) return 'No Milestones';
  return `${plural(total, 'Milestone')} · ${upcoming === 0 ? 'All Passed' : `${upcoming} Upcoming`}`;
}

/** Tooltip naming the next milestone, e.g. "Next: Beta — Thu 12 Nov 2026". */
export function milestoneSummaryTitle({ total, next }: MilestoneSummary): string | undefined {
  if (next) return `Next: ${next.name} — ${formatDate(next.date)}`;
  return total > 0 ? 'All milestones have passed' : undefined;
}
