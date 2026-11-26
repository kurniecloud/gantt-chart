import { describe, expect, it } from 'vitest';
import { placeByDate, sameMilestones, sortByDate } from './milestones';
import type { ISODate } from './types';

type Row = { id: string; date: ISODate | undefined };

const rows = (...spec: [string, ISODate | undefined][]): Row[] =>
  spec.map(([id, date]) => ({ id, date }));
const ids = (list: Row[]) => list.map((r) => r.id);

describe('sortByDate', () => {
  it('puts the earliest date first and rows without a date last', () => {
    const list = rows(
      ['c', '2026-12-01'],
      ['none', undefined],
      ['a', '2026-11-02'],
      ['b', '2026-11-20'],
    );
    expect(ids(sortByDate(list))).toEqual(['a', 'b', 'c', 'none']);
  });

  it('keeps the order of rows on the same day and of rows without a date', () => {
    const list = rows(
      ['x', undefined],
      ['late', '2026-11-20'],
      ['first', '2026-11-02'],
      ['y', undefined],
      ['second', '2026-11-02'],
    );
    expect(ids(sortByDate(list))).toEqual(['first', 'second', 'late', 'x', 'y']);
  });

  it('returns a new list and leaves the given one alone', () => {
    const list = rows(['b', '2026-11-20'], ['a', '2026-11-02']);
    const sorted = sortByDate(list);
    expect(sorted).not.toBe(list);
    expect(ids(list)).toEqual(['b', 'a']);
  });
});

describe('placeByDate', () => {
  it('moves a row whose date was picked into its place by date', () => {
    const list = rows(['a', '2026-11-02'], ['c', '2026-12-01'], ['new', '2026-11-20']);
    expect(ids(placeByDate(list, 'new'))).toEqual(['a', 'new', 'c']);
  });

  it('puts a row picked on a day that is already taken after the others on that day', () => {
    const list = rows(
      ['moved', '2026-11-20'],
      ['a', '2026-11-20'],
      ['b', '2026-11-20'],
      ['c', '2026-12-01'],
    );
    expect(ids(placeByDate(list, 'moved'))).toEqual(['a', 'b', 'moved', 'c']);
  });

  it('puts a dated row above the rows without a date', () => {
    const list = rows(['a', '2026-11-02'], ['empty', undefined], ['picked', '2026-12-01']);
    expect(ids(placeByDate(list, 'picked'))).toEqual(['a', 'picked', 'empty']);
  });

  it('moves a row whose date was cleared to the very bottom, below other rows without a date', () => {
    const list = rows(['cleared', undefined], ['a', '2026-11-02'], ['empty', undefined]);
    expect(ids(placeByDate(list, 'cleared'))).toEqual(['a', 'empty', 'cleared']);
  });

  it('leaves the list as it is when the row already sits in its place', () => {
    const list = rows(['a', '2026-11-02'], ['b', '2026-11-20'], ['c', '2026-12-01']);
    expect(ids(placeByDate(list, 'b'))).toEqual(['a', 'b', 'c']);
  });

  it('sorts the other rows by date if they are out of order', () => {
    const list = rows(['c', '2026-12-01'], ['a', '2026-11-02'], ['picked', '2026-11-20']);
    expect(ids(placeByDate(list, 'picked'))).toEqual(['a', 'picked', 'c']);
  });

  it('just sorts when the row is not in the list', () => {
    const list = rows(['b', '2026-11-20'], ['a', '2026-11-02']);
    expect(ids(placeByDate(list, 'missing'))).toEqual(['a', 'b']);
  });
});

describe('sameMilestones', () => {
  const kickOff = { id: 'a', name: 'Kick-off', date: '2026-11-02' as ISODate };
  const launch = { id: 'b', name: 'Launch', date: '2026-11-20' as ISODate };

  it('matches the same milestones in the same order, whatever the key order', () => {
    const reordered = { date: kickOff.date, name: kickOff.name, id: kickOff.id };
    expect(sameMilestones([kickOff, launch], [reordered, { ...launch }])).toBe(true);
  });

  it('tells apart another order, a changed field or a different count', () => {
    expect(sameMilestones([kickOff, launch], [launch, kickOff])).toBe(false);
    expect(sameMilestones([kickOff], [{ ...kickOff, name: 'Start' }])).toBe(false);
    expect(sameMilestones([kickOff], [{ ...kickOff, date: '2026-11-03' }])).toBe(false);
    expect(sameMilestones([kickOff], [kickOff, launch])).toBe(false);
  });
});
