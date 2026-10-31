import { describe, expect, it } from 'vitest';
import {
  fromWeekdayIndex,
  isWeekend,
  nextWeekday,
  previousWeekday,
  startOfWeek,
  weekdayIndex,
} from './workweek';

describe('isWeekend / nextWeekday / previousWeekday', () => {
  it.each([
    ['2026-10-30', false, '2026-10-30', '2026-10-30'], // Fri
    ['2026-10-31', true, '2026-11-02', '2026-10-30'], // Sat → Mon / Fri
    ['2026-11-01', true, '2026-11-02', '2026-10-30'], // Sun → Mon / Fri
    ['2026-11-02', false, '2026-11-02', '2026-11-02'], // Mon
  ])('%s weekend=%s next=%s previous=%s', (date, weekend, next, previous) => {
    expect(isWeekend(date)).toBe(weekend);
    expect(nextWeekday(date)).toBe(next);
    expect(previousWeekday(date)).toBe(previous);
  });
});

describe('weekdayIndex', () => {
  it.each([
    ['1970-01-05', 0], // Mon, the origin
    ['1970-01-09', 4], // Fri
    ['1970-01-12', 5], // next Mon
    ['1970-01-02', -1], // Fri before the origin
    ['1969-12-29', -5], // Mon before the origin
  ])('%s → %i', (date, index) => {
    expect(weekdayIndex(date)).toBe(index);
    expect(fromWeekdayIndex(index)).toBe(date);
  });

  it('counts consecutive weekdays across a weekend', () => {
    expect(weekdayIndex('2026-11-02') - weekdayIndex('2026-10-30')).toBe(1); // Fri → Mon
  });

  it('maps weekend days to the following Monday', () => {
    expect(weekdayIndex('2026-10-31')).toBe(weekdayIndex('2026-11-02'));
    expect(weekdayIndex('2026-11-01')).toBe(weekdayIndex('2026-11-02'));
  });

  it('round-trips every weekday over several years', () => {
    for (let i = weekdayIndex('2025-01-01'); i < weekdayIndex('2028-01-01'); i++) {
      expect(weekdayIndex(fromWeekdayIndex(i))).toBe(i);
    }
  });
});

describe('startOfWeek', () => {
  it.each([
    ['2026-09-28', '2026-09-28'], // Mon
    ['2026-10-02', '2026-09-28'], // Fri
    ['2026-10-04', '2026-09-28'], // Sun belongs to the week that started on Monday
    ['2027-01-01', '2026-12-28'], // across a year boundary
  ])('%s → %s', (date, expected) => {
    expect(startOfWeek(date)).toBe(expected);
  });
});
