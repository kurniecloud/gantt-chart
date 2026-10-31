import { describe, expect, it } from 'vitest';
import { weekdayIndex } from '../../domain/workweek';
import {
  DAY_WIDTH,
  WEEK_WIDTH,
  barGeometry,
  columnOfDate,
  columnStartDate,
  createScale,
  dateAtX,
  initialColumn,
  todayColumn,
} from './scale';

const WED = '2026-11-04';
const SAT = '2026-10-31';

describe('createScale', () => {
  it('starts on a Monday about ten years back and covers about ten years ahead', () => {
    const scale = createScale('daily', WED);
    expect(columnStartDate(scale, 0)).toBe('2016-10-31'); // Monday
    expect(scale.originIndex % 5).toBe(0);
    expect(columnStartDate(scale, scale.columnCount - 1)).toBe('2036-11-04');
    expect(scale.totalWidth).toBe(scale.columnCount * DAY_WIDTH);
  });

  it('uses 3× wider columns in weekly view, a fifth of a column per weekday', () => {
    const daily = createScale('daily', WED);
    const weekly = createScale('weekly', WED);
    expect(weekly.columnWidth).toBe(WEEK_WIDTH);
    expect(weekly.dayWidth).toBeCloseTo(WEEK_WIDTH / 5);
    expect(weekly.columnCount).toBe(Math.ceil(daily.columnCount / 5));
    expect(columnStartDate(weekly, 1)).toBe('2016-11-07'); // next Monday
  });
});

describe('columns', () => {
  const daily = createScale('daily', WED);
  const weekly = createScale('weekly', WED);

  it('skips weekends between consecutive daily columns', () => {
    const friday = columnOfDate(daily, '2026-10-30');
    expect(columnOfDate(daily, '2026-11-02')).toBe(friday + 1); // Monday
    expect(columnStartDate(daily, friday + 1)).toBe('2026-11-02');
  });

  it('puts every day of a week, weekend included, in that week’s column', () => {
    const column = columnOfDate(weekly, '2026-10-26');
    for (const day of ['2026-10-27', '2026-10-30', '2026-10-31', '2026-11-01']) {
      expect(columnOfDate(weekly, day)).toBe(column);
    }
    expect(columnOfDate(weekly, '2026-11-02')).toBe(column + 1);
  });

  it('clamps dates outside the range to the first or last column', () => {
    expect(columnOfDate(daily, '1990-01-01')).toBe(0);
    expect(columnOfDate(daily, '2090-01-01')).toBe(daily.columnCount - 1);
  });

  it('maps x positions back to weekdays', () => {
    const x = (weekdayIndex(WED) - daily.originIndex) * DAY_WIDTH;
    expect(dateAtX(daily, x)).toBe(WED);
    expect(dateAtX(daily, x + DAY_WIDTH - 1)).toBe(WED);
    expect(dateAtX(weekly, (weekdayIndex(WED) - weekly.originIndex) * weekly.dayWidth)).toBe(WED);
    expect(dateAtX(daily, -500)).toBe(columnStartDate(daily, 0));
  });
});

describe('barGeometry', () => {
  const daily = createScale('daily', WED);
  const weekly = createScale('weekly', WED);
  const x = (date: string) => (weekdayIndex(date) - daily.originIndex) * DAY_WIDTH;

  it.each([
    ['2026-11-02', '2026-11-06', 5], // Mon–Fri
    ['2026-11-04', '2026-11-04', 1], // one day
    ['2026-11-05', '2026-11-10', 4], // Thu–Tue across a weekend
    ['2026-10-31', '2026-11-03', 2], // weekend start trimmed to Mon
    ['2026-11-05', '2026-11-08', 2], // weekend end trimmed to Fri
    ['2026-10-31', '2026-11-01', 0], // weekend only → marker
  ])('%s → %s spans %i weekdays', (start, finish, weekdays) => {
    const bar = barGeometry(daily, { start, finish });
    expect(bar.width).toBe(weekdays * DAY_WIDTH);
    expect(bar.x).toBe(x(start === '2026-10-31' ? '2026-11-02' : start));
  });

  it('keeps exact days inside a week in weekly view', () => {
    const bar = barGeometry(weekly, { start: '2026-11-04', finish: '2026-11-05' }); // Wed–Thu
    const weekStartX = columnOfDate(weekly, '2026-11-02') * WEEK_WIDTH;
    expect(bar.x).toBeCloseTo(weekStartX + 2 * weekly.dayWidth);
    expect(bar.width).toBeCloseTo(2 * weekly.dayWidth);
  });
});

describe('today', () => {
  it('highlights today’s column on a weekday', () => {
    const scale = createScale('daily', WED);
    expect(todayColumn(scale, WED)).toBe(columnOfDate(scale, WED));
    expect(initialColumn(scale, WED)).toBe(columnOfDate(scale, WED));
  });

  it('on a weekend: daily highlights nothing and opens on Monday; weekly highlights the week just ending', () => {
    const daily = createScale('daily', SAT);
    expect(todayColumn(daily, SAT)).toBeNull();
    expect(columnStartDate(daily, initialColumn(daily, SAT))).toBe('2026-11-02');

    const weekly = createScale('weekly', SAT);
    const column = todayColumn(weekly, SAT)!;
    expect(columnStartDate(weekly, column)).toBe('2026-10-26');
    expect(initialColumn(weekly, SAT)).toBe(column);
  });
});
