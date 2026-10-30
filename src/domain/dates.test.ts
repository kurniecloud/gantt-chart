import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  fromDayNumber,
  isISODate,
  toDayNumber,
  todayISO,
  weekday,
} from './dates';

describe('day numbers', () => {
  it.each([
    ['1970-01-01', 0],
    ['1970-01-02', 1],
    ['1969-12-31', -1],
    ['2026-11-02', 20759],
  ])('%s ↔ %i', (date, day) => {
    expect(toDayNumber(date)).toBe(day);
    expect(fromDayNumber(day)).toBe(date);
  });

  it('rejects malformed dates', () => {
    expect(() => toDayNumber('2026-1-2')).toThrow(/Invalid ISO date/);
    expect(() => toDayNumber('2026-11-02T00:00:00Z')).toThrow(/Invalid ISO date/);
  });
});

describe('addDays / diffDays', () => {
  it.each([
    ['2026-02-28', 1, '2026-03-01'],
    ['2028-02-28', 1, '2028-02-29'], // leap year
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-29', 1, '2026-03-30'], // EU DST change
    ['2026-11-01', 1, '2026-11-02'], // US DST change
    ['2026-11-02', -2, '2026-10-31'],
  ])('%s %+i → %s', (date, n, expected) => {
    expect(addDays(date, n)).toBe(expected);
    expect(diffDays(date, expected)).toBe(n);
  });
});

describe('weekday', () => {
  it.each([
    ['1970-01-01', 4], // Thu
    ['2026-11-01', 0], // Sun
    ['2026-11-02', 1], // Mon
    ['2026-11-07', 6], // Sat
  ])('%s → %i', (date, expected) => {
    expect(weekday(date)).toBe(expected);
  });
});

describe('isISODate', () => {
  it.each([
    ['2026-11-02', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-11-2', false],
    [20261102, false],
    [null, false],
  ])('%s → %s', (value, expected) => {
    expect(isISODate(value)).toBe(expected);
  });
});

describe('todayISO', () => {
  it('uses the local calendar day, not UTC', () => {
    // 23:30 local time must still be the same local day whatever the timezone.
    expect(todayISO(new Date(2026, 10, 2, 23, 30))).toBe('2026-11-02');
    expect(todayISO(new Date(2026, 10, 2, 0, 15))).toBe('2026-11-02');
  });
});
