import { describe, expect, it } from 'vitest';
import { barLabel, dayLabel, monthKey, monthLabel, weekLabel } from './labels';

describe('header labels', () => {
  it.each([
    ['2026-11-02', 'Mon 2'],
    ['2026-10-30', 'Fri 30'],
  ])('day %s → %s', (date, label) => {
    expect(dayLabel(date)).toBe(label);
  });

  it.each([
    ['2026-09-28', '28 Sep - 2 Oct'], // across months, as in the spec
    ['2026-11-02', '2 Nov - 6 Nov'],
    ['2026-12-28', '28 Dec - 1 Jan'], // across years
  ])('week of %s → %s', (monday, label) => {
    expect(weekLabel(monday)).toBe(label);
  });

  it('labels and groups months', () => {
    expect(monthLabel('2026-11-02')).toBe('November 2026');
    expect(monthKey('2026-11-30')).toBe(monthKey('2026-11-02'));
    expect(monthKey('2026-12-01')).not.toBe(monthKey('2026-11-30'));
  });
});

describe('barLabel', () => {
  it('names the task, its dates and its priority', () => {
    expect(barLabel('Design', { start: '2026-11-02', finish: '2026-11-06' }, 'high')).toBe(
      'Design: Mon 2 Nov 2026 – Fri 6 Nov 2026 · High priority',
    );
    expect(barLabel('Launch', { start: '2026-11-06', finish: '2026-11-06' }, undefined)).toBe(
      'Launch: Fri 6 Nov 2026 · No priority',
    );
  });
});
