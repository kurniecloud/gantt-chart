import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { effectiveSpans, ownSpan, spanWeekdays } from './taskDates';

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
