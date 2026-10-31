import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { criticalPath } from './criticalPath';

type Spec = Parameters<typeof makeProject>[0];
const critical = (spec: Spec) => [...criticalPath(makeProject(spec)).criticalIds].sort();

// Dates: 2026-11-02 is a Monday.
describe('criticalPath (driving chain)', () => {
  it('is empty when no task has dates', () => {
    expect(critical({ tasks: [{ id: 'A' }, { id: 'B' }] })).toEqual([]);
  });

  it('without links, only tasks finishing on the last day are critical', () => {
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

  it('follows the chain back from the last task, spare days and all', () => {
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-03' },
          { id: 'B', start: '2026-11-05', finish: '2026-11-06', deps: [{ from: 'A' }] }, // gap Wed
          { id: 'C', start: '2026-11-11', finish: '2026-11-12', deps: [{ from: 'B' }] }, // gap Mon–Tue
          { id: 'D', start: '2026-11-02', finish: '2026-11-04' }, // not linked
        ],
      }),
    ).toEqual(['A', 'B', 'C']);
  });

  it('takes only the blocker that finishes latest (ties: all of them)', () => {
    expect(
      critical({
        tasks: [
          { id: 'Long', start: '2026-11-02', finish: '2026-11-06' },
          { id: 'Short', start: '2026-11-02', finish: '2026-11-03' },
          { id: 'Twin', start: '2026-11-04', finish: '2026-11-06' },
          {
            id: 'End',
            start: '2026-11-09',
            finish: '2026-11-10',
            deps: [{ from: 'Long' }, { from: 'Short' }, { from: 'Twin' }],
          },
        ],
      }),
    ).toEqual(['End', 'Long', 'Twin']);
  });

  it('works through links between parent tasks, marking parents and their driving subtasks', () => {
    // The scenario from the user's screenshot: Planning → Build → Test → Launch, with gaps and a
    // Test subtask that starts before Build ends.
    const result = criticalPath(
      makeProject({
        tasks: [
          { id: 'Planning' },
          { id: 'Gather', parent: 'Planning', start: '2026-10-29', finish: '2026-11-04' },
          { id: 'Write', parent: 'Planning', start: '2026-11-05', finish: '2026-11-10' },
          { id: 'Build', deps: [{ from: 'Planning' }] },
          { id: 'Design', parent: 'Build', start: '2026-11-11', finish: '2026-11-17' },
          { id: 'Implement', parent: 'Build', start: '2026-11-18', finish: '2026-12-01' },
          { id: 'Test', deps: [{ from: 'Build' }] },
          { id: 'Early', parent: 'Test', start: '2026-11-18', finish: '2026-11-18' },
          { id: 'Late', parent: 'Test', start: '2026-12-04', finish: '2026-12-04' },
          { id: 'Launch', start: '2026-12-08', finish: '2026-12-08', deps: [{ from: 'Test' }] },
        ],
      }),
    );
    expect([...result.criticalIds].sort()).toEqual(
      ['Build', 'Implement', 'Late', 'Launch', 'Planning', 'Test', 'Write'].sort(),
    );
    expect([...result.leafIds].sort()).toEqual(['Implement', 'Late', 'Launch', 'Write']);
  });

  it('looks through undated tasks in the chain', () => {
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-03' },
          { id: 'U', deps: [{ from: 'A' }] }, // no dates
          { id: 'B', start: '2026-11-09', finish: '2026-11-10', deps: [{ from: 'U' }] },
        ],
      }),
    ).toEqual(['A', 'B']);
  });

  it('stops on loops in bad data instead of hanging', () => {
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-06', deps: [{ from: 'B' }] },
          { id: 'B', start: '2026-11-02', finish: '2026-11-06', deps: [{ from: 'A' }] },
        ],
      }),
    ).toEqual(['A', 'B']);
  });

  it('treats a weekend finish as the Friday before', () => {
    expect(
      critical({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-07' }, // ends Sat → Fri
          { id: 'B', start: '2026-11-04', finish: '2026-11-06' }, // ends Fri
        ],
      }),
    ).toEqual(['A', 'B']);
  });
});
