import { describe, expect, it } from 'vitest';
import type { ProjectSummary } from '../../domain/summary';
import {
  lengthLabel,
  lengthTitle,
  milestoneSummaryLabel,
  milestoneSummaryTitle,
  taskCountTitle,
} from './summaryLabels';

const summary = (mainTaskCount: number, edgeTaskCount: number): ProjectSummary => ({
  mainTaskCount,
  edgeTaskCount,
  planned: null,
  actual: null,
  inProgress: false,
});

describe('task count tooltip', () => {
  it.each([
    [summary(5, 10), '5 Main Tasks, 10 Edge Tasks (Without Subtasks)'],
    [summary(1, 1), '1 Main Task, 1 Edge Task (Without Subtasks)'],
    [summary(0, 0), '0 Main Tasks, 0 Edge Tasks (Without Subtasks)'],
  ])('%j → %s', (input, expected) => {
    expect(taskCountTitle(input)).toBe(expected);
  });
});

describe('length labels', () => {
  const length = { start: '2026-11-02', finish: '2027-01-01', days: 45 };

  it('shows weekdays as "nD", or a dash without dates', () => {
    expect(lengthLabel(length)).toBe('45D');
    expect(lengthLabel(null)).toBe('—');
  });

  it('spells out the dates in the tooltip', () => {
    expect(lengthTitle('Planned', length)).toBe(
      'Planned: Mon 2 Nov 2026 – Fri 1 Jan 2027 (45 Weekdays)',
    );
    expect(
      lengthTitle('Actual', { start: '2026-11-04', finish: '2026-11-04', days: 1 }, true),
    ).toBe('Actual: Wed 4 Nov 2026 (1 Weekday, In Progress)');
    expect(lengthTitle('Planned', null)).toBe('Planned: No Dates Yet');
    expect(lengthTitle('Actual', null)).toBe('Actual: No Actual Dates Yet');
  });
});

describe('milestone summary', () => {
  const beta = { id: 'b', name: 'Beta', date: '2026-11-12' };

  it.each([
    [{ total: 5, upcoming: 3, next: beta }, '5 Milestones · 3 Upcoming'],
    [{ total: 1, upcoming: 1, next: beta }, '1 Milestone · 1 Upcoming'],
    [{ total: 3, upcoming: 0, next: null }, '3 Milestones · All Passed'],
    [{ total: 0, upcoming: 0, next: null }, 'No Milestones'],
  ])('%j → %s', (input, expected) => {
    expect(milestoneSummaryLabel(input)).toBe(expected);
  });

  it('names the next milestone in the tooltip', () => {
    expect(milestoneSummaryTitle({ total: 5, upcoming: 3, next: beta })).toBe(
      'Next: Beta — Thu 12 Nov 2026',
    );
    expect(milestoneSummaryTitle({ total: 3, upcoming: 0, next: null })).toBe(
      'All milestones have passed',
    );
    expect(milestoneSummaryTitle({ total: 0, upcoming: 0, next: null })).toBeUndefined();
  });
});
