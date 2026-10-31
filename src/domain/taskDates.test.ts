import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { effectiveSpans, ownActualSpan, ownSpan, shiftSpan, spanWeekdays } from './taskDates';

describe('ownSpan', () => {
  it.each([
    [
      { start: '2026-11-02', finish: '2026-11-06' },
      { start: '2026-11-02', finish: '2026-11-06' },
    ],
    [{ start: '2026-11-02' }, { start: '2026-11-02', finish: '2026-11-02' }], // start only → 1 day
    [{ finish: '2026-11-06' }, { start: '2026-11-06', finish: '2026-11-06' }], // end only → 1 day
    [{}, null],
    [
      { start: '2026-11-06', finish: '2026-11-02' },
      { start: '2026-11-02', finish: '2026-11-06' },
    ],
  ])('%j → %j', (task, expected) => {
    expect(ownSpan(task)).toEqual(expected);
  });
});

describe('effectiveSpans', () => {
  it('uses a leaf task’s own dates', () => {
    const project = makeProject({
      tasks: [{ id: 'A', start: '2026-11-02', finish: '2026-11-04' }],
    });
    expect(effectiveSpans(project).get('A')).toEqual({
      start: '2026-11-02',
      finish: '2026-11-04',
      fromSubtasks: false,
    });
  });

  it('omits tasks with no dates anywhere', () => {
    const project = makeProject({ tasks: [{ id: 'A' }, { id: 'A1', parent: 'A' }] });
    expect(effectiveSpans(project).size).toBe(0);
  });

  it('spans dated subtasks recursively, ignoring the parent’s own dates', () => {
    const project = makeProject({
      tasks: [
        { id: 'P', start: '2026-12-01', finish: '2026-12-31' },
        { id: 'A', parent: 'P', start: '2026-11-04', finish: '2026-11-06' },
        { id: 'B', parent: 'P' },
        { id: 'B1', parent: 'B', start: '2026-11-10' }, // start only
        { id: 'B2', parent: 'B', finish: '2026-11-20' }, // end only
      ],
    });
    const spans = effectiveSpans(project);
    expect(spans.get('B')).toEqual({
      start: '2026-11-10',
      finish: '2026-11-20',
      fromSubtasks: true,
    });
    expect(spans.get('P')).toEqual({
      start: '2026-11-04',
      finish: '2026-11-20',
      fromSubtasks: true,
    });
  });

  it('falls back to the parent’s own dates when no subtask has dates', () => {
    const project = makeProject({
      tasks: [
        { id: 'P', start: '2026-11-02', finish: '2026-11-03' },
        { id: 'C', parent: 'P' },
      ],
    });
    expect(effectiveSpans(project).get('P')).toEqual({
      start: '2026-11-02',
      finish: '2026-11-03',
      fromSubtasks: false,
    });
  });
});

describe('spanWeekdays', () => {
  it.each([
    ['2026-11-02', '2026-11-06', 5], // Mon–Fri
    ['2026-11-04', '2026-11-04', 1],
    ['2026-11-05', '2026-11-10', 4], // across a weekend
    ['2026-10-31', '2026-11-01', 0], // weekend only
  ])('%s → %s = %i', (start, finish, expected) => {
    expect(spanWeekdays({ start, finish })).toBe(expected);
  });
});

describe('actual spans', () => {
  it('uses actual dates, and parents span their subtasks’ actual dates', () => {
    const project = makeProject({
      tasks: [
        { id: 'P' },
        {
          id: 'A',
          parent: 'P',
          start: '2026-11-02',
          actualStart: '2026-11-03',
          actualFinish: '2026-11-05',
        },
        { id: 'B', parent: 'P', actualStart: '2026-11-09' }, // in progress
        { id: 'C', start: '2026-11-02', finish: '2026-11-04' }, // no actuals
      ],
    });
    const actual = effectiveSpans(project, 'actual');
    expect(actual.get('A')).toEqual({
      start: '2026-11-03',
      finish: '2026-11-05',
      fromSubtasks: false,
    });
    expect(actual.get('B')).toEqual({
      start: '2026-11-09',
      finish: '2026-11-09',
      fromSubtasks: false,
    });
    expect(actual.get('P')).toEqual({
      start: '2026-11-03',
      finish: '2026-11-09',
      fromSubtasks: true,
    });
    expect(actual.has('C')).toBe(false);
    expect(effectiveSpans(project).get('A')).toMatchObject({ start: '2026-11-02' }); // planned untouched
  });
});

describe('in-progress actuals', () => {
  it('runs a started task up to today (Friday on weekends), or one day if it starts later', () => {
    expect(ownActualSpan({ actualStart: '2026-11-02' }, '2026-11-04')).toEqual({
      start: '2026-11-02',
      finish: '2026-11-04',
    });
    expect(ownActualSpan({ actualStart: '2026-11-02' }, '2026-11-08')).toEqual({
      start: '2026-11-02',
      finish: '2026-11-06', // Sunday → Friday
    });
    expect(ownActualSpan({ actualStart: '2026-11-10' }, '2026-11-04')).toEqual({
      start: '2026-11-10',
      finish: '2026-11-10',
    });
    expect(
      ownActualSpan({ actualStart: '2026-11-02', actualFinish: '2026-11-03' }, '2026-11-20'),
    ).toEqual({
      start: '2026-11-02',
      finish: '2026-11-03',
    });
  });

  it('carries into parents', () => {
    const project = makeProject({
      tasks: [{ id: 'P' }, { id: 'A', parent: 'P', actualStart: '2026-11-02' }],
    });
    expect(effectiveSpans(project, 'actual', '2026-11-05').get('P')).toMatchObject({
      start: '2026-11-02',
      finish: '2026-11-05',
    });
  });
});

describe('shiftSpan', () => {
  const span = { start: '2026-11-04', finish: '2026-11-06' }; // Wed–Fri
  it.each([
    ['move', 1, '2026-11-05', '2026-11-09'], // Thu–Mon, keeps 3 weekdays
    ['move', -3, '2026-10-30', '2026-11-03'], // three weekdays back: Fri–Tue
    ['start', -2, '2026-11-02', '2026-11-06'], // longer
    ['start', 5, '2026-11-06', '2026-11-06'], // never past the end: 1 day
    ['end', 2, '2026-11-04', '2026-11-10'], // over the weekend
    ['end', -9, '2026-11-04', '2026-11-04'], // never before the start
  ] as const)('%s by %i → %s – %s', (mode, delta, start, finish) => {
    expect(shiftSpan(span, mode, delta)).toEqual({ start, finish });
  });
});
