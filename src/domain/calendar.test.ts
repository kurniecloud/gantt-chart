import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  createStandardCalendar,
  finishFromStart,
  isWorkingDay,
  nextWorkingDay,
  prevWorkingDay,
  startFromFinish,
  workingDaysBetween,
} from './calendar';
import type { Calendar } from './types';

// 2026-11-02 is a Monday. 2026-11-11 (Wed) is a holiday, 2026-11-14 (Sat) an extra working day.
const calendar: Calendar = {
  ...createStandardCalendar(),
  exceptions: [
    { date: '2026-11-11', working: false, name: 'Holiday' },
    { date: '2026-11-14', working: true, name: 'Make-up day' },
  ],
};
const standard = createStandardCalendar();

describe('isWorkingDay', () => {
  it.each([
    ['2026-11-02', true], // Mon
    ['2026-11-07', false], // Sat
    ['2026-11-08', false], // Sun
    ['2026-11-11', false], // Wed holiday
    ['2026-11-14', true], // Sat make-up day
  ])('%s → %s', (date, expected) => {
    expect(isWorkingDay(calendar, date)).toBe(expected);
  });
});

describe('next/prevWorkingDay', () => {
  it.each([
    ['2026-11-02', '2026-11-02', '2026-11-02'], // Mon stays
    ['2026-11-07', '2026-11-09', '2026-11-06'], // Sat → Mon / Fri
    ['2026-11-11', '2026-11-12', '2026-11-10'], // holiday → Thu / Tue
  ])('%s → next %s, prev %s', (date, next, prev) => {
    expect(nextWorkingDay(calendar, date)).toBe(next);
    expect(prevWorkingDay(calendar, date)).toBe(prev);
  });
});

describe('addWorkingDays', () => {
  it.each([
    ['2026-11-04', 1, '2026-11-05'], // Wed → Thu
    ['2026-11-06', 1, '2026-11-09'], // Fri → Mon (weekend)
    ['2026-11-06', 2, '2026-11-10'], // Fri → Tue
    ['2026-11-10', 1, '2026-11-12'], // Tue → Thu (skips holiday)
    ['2026-11-13', 1, '2026-11-14'], // Fri → make-up Sat
    ['2026-11-09', -1, '2026-11-06'], // Mon → Fri
    ['2026-11-12', -1, '2026-11-10'], // Thu → Tue (skips holiday)
    ['2026-11-07', 0, '2026-11-09'], // Sat, 0 → next working day
    ['2026-11-07', 1, '2026-11-09'], // Sat +1 → Mon
  ])('%s %+i → %s', (date, n, expected) => {
    expect(addWorkingDays(calendar, date, n)).toBe(expected);
  });

  it('rejects fractional offsets', () => {
    expect(() => addWorkingDays(calendar, '2026-11-02', 1.5)).toThrow(/integer/);
  });

  it('throws on a calendar with no working days', () => {
    const broken: Calendar = { ...standard, workingWeekdays: Array(7).fill(false) };
    expect(() => addWorkingDays(broken, '2026-11-02', 1)).toThrow(/no working days/);
  });
});

describe('finishFromStart / startFromFinish', () => {
  it.each([
    ['2026-11-02', 1, '2026-11-02'], // Mon, 1d → Mon
    ['2026-11-02', 3, '2026-11-04'], // Mon, 3d → Wed
    ['2026-11-05', 3, '2026-11-09'], // Thu, 3d → Mon (weekend)
    ['2026-11-09', 4, '2026-11-13'], // Mon, 4d → Fri (holiday Wed)
    ['2026-11-02', 0, '2026-11-02'], // milestone
  ])('start %s, %i days → finish %s', (start, duration, finish) => {
    expect(finishFromStart(calendar, start, duration)).toBe(finish);
    expect(startFromFinish(calendar, finish, duration)).toBe(start);
  });

  it('snaps a start on a non-working day forward', () => {
    expect(finishFromStart(calendar, '2026-11-07', 2)).toBe('2026-11-10'); // Sat → Mon–Tue
  });
});

describe('workingDaysBetween', () => {
  it.each([
    ['2026-11-02', '2026-11-06', 5], // Mon–Fri
    ['2026-11-02', '2026-11-08', 5], // incl. weekend
    ['2026-11-09', '2026-11-15', 5], // holiday Wed, make-up Sat
    ['2026-11-02', '2026-11-02', 1],
    ['2026-11-07', '2026-11-08', 0],
    ['2026-11-06', '2026-11-02', 0], // reversed
  ])('%s..%s → %i', (a, b, expected) => {
    expect(workingDaysBetween(calendar, a, b)).toBe(expected);
  });
});

// The worked example in .claude/skills/scheduling-engine/SKILL.md, expressed with calendar
// primitives so the documented formulas are pinned by tests.
describe('scheduling-engine skill worked example', () => {
  const a = { start: '2026-11-02', finish: finishFromStart(standard, '2026-11-02', 3) };
  it('A: Mon, 3d → Wed', () => expect(a.finish).toBe('2026-11-04'));

  const bStart = addWorkingDays(standard, a.finish, 1 + 0);
  const b = { start: bStart, finish: finishFromStart(standard, bStart, 2) };
  it('B FS+0 on A, 2d → Thu–Fri', () =>
    expect(b).toEqual({ start: '2026-11-05', finish: '2026-11-06' }));

  it('C FS+1 on B → Tue', () =>
    expect(addWorkingDays(standard, b.finish, 1 + 1)).toBe('2026-11-10'));
  it('D SS+2 on A → Wed', () => expect(addWorkingDays(standard, a.start, 2)).toBe('2026-11-04'));
  it('E FF+0 on B, 3d → Wed–Fri', () => {
    const finish = addWorkingDays(standard, b.finish, 0);
    expect({ start: startFromFinish(standard, finish, 3), finish }).toEqual({
      start: '2026-11-04',
      finish: '2026-11-06',
    });
  });
});
