import type { MilestoneSummary, ProjectLength, ProjectSummary } from '../../domain/summary';
import { formatDate } from '../../utils/formatDate';

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Tooltip for the task count, e.g. "5 main tasks, 10 edge tasks (without subtasks)". */
export function taskCountTitle({ mainTaskCount, edgeTaskCount }: ProjectSummary): string {
  return `${plural(mainTaskCount, 'main task')}, ${plural(edgeTaskCount, 'edge task')} (without subtasks)`;
}

/** The figure shown for a length, e.g. "45D", or "—" when there are no dates. */
export function lengthLabel(length: ProjectLength | null): string {
  return length ? `${length.days}D` : '—';
}

/** Tooltip, e.g. "Planned: Mon 2 Nov 2026 – Fri 1 Jan 2027 (45 weekdays)". */
export function lengthTitle(
  kind: 'Planned' | 'Actual',
  length: ProjectLength | null,
  inProgress = false,
): string {
  if (!length) return `${kind}: no ${kind === 'Actual' ? 'actual ' : ''}dates yet`;
  const dates =
    length.start === length.finish
      ? formatDate(length.start)
      : `${formatDate(length.start)} – ${formatDate(length.finish)}`;
  return `${kind}: ${dates} (${plural(length.days, 'weekday')}${inProgress ? ', in progress' : ''})`;
}

/** e.g. "5 milestones · 3 upcoming", "3 milestones · all passed", "No milestones". */
export function milestoneSummaryLabel({ total, upcoming }: MilestoneSummary): string {
  if (total === 0) return 'No milestones';
  return `${plural(total, 'milestone')} · ${upcoming === 0 ? 'all passed' : `${upcoming} upcoming`}`;
}

/** Tooltip naming the next milestone, e.g. "Next: Beta — Thu 12 Nov 2026". */
export function milestoneSummaryTitle({ total, next }: MilestoneSummary): string | undefined {
  if (next) return `Next: ${next.name} — ${formatDate(next.date)}`;
  return total > 0 ? 'All milestones have passed' : undefined;
}
