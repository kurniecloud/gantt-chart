import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { criticalPath } from './criticalPath';

const critical = (spec: Parameters<typeof makeProject>[0]) =>
  [...criticalPath(makeProject(spec)).criticalIds].sort();

// Dates: 2026-11-02 is a Monday.
describe('criticalPath', () => {
  it('is empty when no task has dates', () => {
    expect(critical({ tasks: [{ id: 'A' }, { id: 'B' }] })).toEqual([]);
  });

  it('without dependencies, only tasks finishing on the last day are critical', () => {
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-04' },
          { id: 'B', start: '2026-11-02', finish: '2026-11-06' }, // ends last
          { id: 'C', start: '2026-11-05', finish: '2026-11-06' }, // ends last too
        ],
      }),
    ).toEqual(['B', 'C']);
  });

  it('follows a back-to-back chain of dependencies to the end', () => {
    const result = criticalPath(
      makeProject({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-04' }, // Mon–Wed
          { id: 'B', start: '2026-11-05', finish: '2026-11-09', deps: [{ from: 'A' }] }, // Thu–Mon
          { id: 'C', start: '2026-11-10', finish: '2026-11-10', deps: [{ from: 'B' }] }, // Tue
          { id: 'D', start: '2026-11-02', finish: '2026-11-03' }, // floats
        ],
      }),
    );
    expect([...result.criticalIds].sort()).toEqual(['A', 'B', 'C']);
    expect(result.slack.get('D')).toBe(5); // Tue 3 → Tue 10: five weekdays to spare
  });

  it('gives slack to a predecessor that finishes early', () => {
    const result = criticalPath(
      makeProject({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-03' }, // Mon–Tue, B starts Thu
          { id: 'B', start: '2026-11-05', finish: '2026-11-06', deps: [{ from: 'A' }] },
        ],
      }),
    );
    expect(result.slack.get('A')).toBe(1); // could finish Wed
    expect([...result.criticalIds]).toEqual(['B']);
  });

  it('picks the longer of two branches into the same task', () => {
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-06' }, // 5 days, ends Fri
          { id: 'B', start: '2026-11-02', finish: '2026-11-03' }, // 2 days
          {
            id: 'C',
            start: '2026-11-09',
            finish: '2026-11-10',
            deps: [{ from: 'A' }, { from: 'B' }],
          },
        ],
      }),
    ).toEqual(['A', 'C']);
  });

  it('marks a task critical when it overruns its successor (negative slack)', () => {
    const result = criticalPath(
      makeProject({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-06' },
          { id: 'B', start: '2026-11-04', finish: '2026-11-13', deps: [{ from: 'A' }] },
          { id: 'Z', start: '2026-11-02', finish: '2026-11-13' },
        ],
      }),
    );
    expect(result.slack.get('A')).toBe(-3);
    expect(result.criticalIds.has('A')).toBe(true);
  });

  it('marks parents of critical subtasks, and expands links to parents', () => {
    expect(
      critical({
        tasks: [
          { id: 'P' },
          { id: 'A', parent: 'P', start: '2026-11-02', finish: '2026-11-03' },
          { id: 'B', parent: 'P', start: '2026-11-02', finish: '2026-11-04' },
          { id: 'X', start: '2026-11-05', finish: '2026-11-06', deps: [{ from: 'P' }] },
        ],
      }),
    ).toEqual(['B', 'P', 'X']);
  });

  it('ignores undated tasks in a chain and survives loops in bad data', () => {
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-03', deps: [{ from: 'B' }] },
          { id: 'B', start: '2026-11-04', finish: '2026-11-05', deps: [{ from: 'A' }] }, // loop
          { id: 'U', deps: [{ from: 'B' }] }, // no dates
        ],
      }),
    ).toEqual(['B']);
  });

  it('counts weekdays only across weekends', () => {
    // A ends Fri, B starts the next Monday: no gap in weekdays.
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-04', finish: '2026-11-06' },
          { id: 'B', start: '2026-11-09', finish: '2026-11-10', deps: [{ from: 'A' }] },
        ],
      }),
    ).toEqual(['A', 'B']);
  });
});
