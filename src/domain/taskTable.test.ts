import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { taskStatus, taskTable } from './taskTable';

const pick = <K extends keyof ReturnType<typeof taskTable>[number]>(
  rows: ReturnType<typeof taskTable>,
  ...keys: K[]
) => rows.map((row) => Object.fromEntries(keys.map((k) => [k, row[k]])));

describe('taskStatus', () => {
  it('is not started without an actual start, even with an actual end', () => {
    expect(taskStatus(undefined, undefined)).toBe('notStarted');
    expect(taskStatus(undefined, '2026-11-06')).toBe('notStarted');
  });

  it('is in progress with only a start and completed with both', () => {
    expect(taskStatus('2026-11-02', undefined)).toBe('inProgress');
    expect(taskStatus('2026-11-02', '2026-11-06')).toBe('completed');
  });
});

describe('taskTable', () => {
  it('numbers tasks by outline, in task-list order, collapsed subtasks included', () => {
    // The owner's example: "sub sub test 2" sits under "sub sub test".
    const project = makeProject({
      tasks: [
        { id: 'T', name: 'Test' },
        { id: 'S1', name: 'sub test 1', parent: 'T' },
        { id: 'SS', name: 'sub sub test', parent: 'S1', collapsed: true },
        { id: 'SSSa', name: 'sub sub sub test a', parent: 'SS' },
        { id: 'SS2', name: 'sub sub test 2', parent: 'SS' },
        { id: 'B', name: 'Build' },
        { id: 'D', name: 'Design UI', parent: 'B' },
      ],
    });
    expect(pick(taskTable(project), 'number', 'name', 'depth', 'hasSubtasks')).toEqual([
      { number: '1', name: 'Test', depth: 0, hasSubtasks: true },
      { number: '1.1', name: 'sub test 1', depth: 1, hasSubtasks: true },
      { number: '1.1.1', name: 'sub sub test', depth: 2, hasSubtasks: true },
      { number: '1.1.1.1', name: 'sub sub sub test a', depth: 3, hasSubtasks: false },
      { number: '1.1.1.2', name: 'sub sub test 2', depth: 3, hasSubtasks: false },
      { number: '2', name: 'Build', depth: 0, hasSubtasks: true },
      { number: '2.1', name: 'Design UI', depth: 1, hasSubtasks: false },
    ]);
  });

  it('counts past nine siblings (1.10 follows 1.9)', () => {
    const subtasks = Array.from({ length: 10 }, (_, i) => ({ id: `S${i}`, parent: 'P' }));
    const rows = taskTable(makeProject({ tasks: [{ id: 'P' }, ...subtasks] }));
    expect(rows.at(-1)!.number).toBe('1.10');
  });

  it('shows a task’s own dates as saved, a start without an end leaving the end empty', () => {
    const rows = taskTable(
      makeProject({
        tasks: [
          { id: 'A', start: '2026-11-02', finish: '2026-11-06', actualStart: '2026-11-03' },
          { id: 'B', start: '2026-11-09' },
        ],
      }),
    );
    expect(rows[0]).toMatchObject({
      plannedStart: '2026-11-02',
      plannedEnd: '2026-11-06',
      actualStart: '2026-11-03',
      actualEnd: undefined,
      status: 'inProgress',
    });
    expect(rows[1]).toMatchObject({
      plannedStart: '2026-11-09',
      plannedEnd: undefined,
      status: 'notStarted',
    });
  });

  it('spans a parent’s planned dates over its subtasks, as the timeline draws them', () => {
    const rows = taskTable(
      makeProject({
        tasks: [
          { id: 'P', start: '2026-10-01', finish: '2026-10-02' },
          { id: 'A', parent: 'P', start: '2026-11-04', finish: '2026-11-06' },
          // A start only is a one-day bar, so it ends the parent's span.
          { id: 'B', parent: 'P', start: '2026-11-10' },
          { id: 'Q', start: '2026-12-01', finish: '2026-12-04' },
          { id: 'C', parent: 'Q' },
        ],
      }),
    );
    expect(pick(rows, 'plannedStart', 'plannedEnd')).toEqual([
      { plannedStart: '2026-11-04', plannedEnd: '2026-11-10' },
      { plannedStart: '2026-11-04', plannedEnd: '2026-11-06' },
      { plannedStart: '2026-11-10', plannedEnd: undefined },
      // No subtask has dates: the parent keeps its own.
      { plannedStart: '2026-12-01', plannedEnd: '2026-12-04' },
      { plannedStart: undefined, plannedEnd: undefined },
    ]);
  });

  it('ends a parent only when every subtask is completed', () => {
    const project = (second: { actualStart?: string; actualFinish?: string }) =>
      makeProject({
        tasks: [
          { id: 'P', actualStart: '2026-01-01', actualFinish: '2026-01-02' },
          { id: 'A', parent: 'P', actualStart: '2026-11-04', actualFinish: '2026-11-09' },
          { id: 'B', parent: 'P', ...second },
        ],
      });
    const parent = (second: { actualStart?: string; actualFinish?: string }) =>
      pick(taskTable(project(second)), 'actualStart', 'actualEnd', 'status')[0];

    expect(parent({ actualStart: '2026-11-02', actualFinish: '2026-11-05' })).toEqual({
      actualStart: '2026-11-02',
      actualEnd: '2026-11-09',
      status: 'completed',
    });
    expect(parent({ actualStart: '2026-11-02' })).toEqual({
      actualStart: '2026-11-02',
      actualEnd: undefined,
      status: 'inProgress',
    });
    // Not started yet (no actual dates): still unfinished.
    expect(parent({})).toEqual({
      actualStart: '2026-11-04',
      actualEnd: undefined,
      status: 'inProgress',
    });
  });

  it('keeps a parent’s own actual dates while no subtask has any', () => {
    const rows = taskTable(
      makeProject({
        tasks: [
          { id: 'P', actualStart: '2026-11-02', actualFinish: '2026-11-03' },
          { id: 'A', parent: 'P', start: '2026-11-04' },
        ],
      }),
    );
    expect(rows[0]).toMatchObject({
      actualStart: '2026-11-02',
      actualEnd: '2026-11-03',
      status: 'completed',
    });
  });

  it('rolls actual dates up through every level', () => {
    const tasks = (lastFinish?: string) => [
      { id: 'G' },
      { id: 'P', parent: 'G' },
      { id: 'A', parent: 'P', actualStart: '2026-11-02', actualFinish: '2026-11-03' },
      { id: 'B', parent: 'G', actualStart: '2026-11-05', actualFinish: lastFinish },
    ];
    const status = (lastFinish?: string) =>
      pick(taskTable(makeProject({ tasks: tasks(lastFinish) })), 'status', 'actualEnd');
    expect(status()).toEqual([
      { status: 'inProgress', actualEnd: undefined },
      { status: 'completed', actualEnd: '2026-11-03' },
      { status: 'completed', actualEnd: '2026-11-03' },
      { status: 'inProgress', actualEnd: undefined },
    ]);
    expect(status('2026-11-10')[0]).toEqual({ status: 'completed', actualEnd: '2026-11-10' });
  });

  it('lists links as outline numbers in task-list order, a parent link as the parent', () => {
    const rows = taskTable(
      makeProject({
        tasks: [
          { id: 'P', name: 'Plan' },
          { id: 'A', parent: 'P' },
          { id: 'B', parent: 'P', deps: [{ from: 'A' }] },
          { id: 'C', deps: [{ from: 'B' }, { from: 'P' }] },
          { id: 'D', deps: [{ from: 'A' }] },
        ],
      }),
    );
    expect(pick(rows, 'number', 'blockedBy', 'blocking')).toEqual([
      { number: '1', blockedBy: [], blocking: ['2'] },
      { number: '1.1', blockedBy: [], blocking: ['1.2', '3'] },
      { number: '1.2', blockedBy: ['1.1'], blocking: ['2'] },
      { number: '2', blockedBy: ['1', '1.2'], blocking: [] },
      { number: '3', blockedBy: ['1.1'], blocking: [] },
    ]);
  });

  it('carries owner, priority and remarks as saved', () => {
    const rows = taskTable(
      makeProject({
        tasks: [
          { id: 'A', owner: 'Ana', priority: 'high', notes: 'Line one\nLine two' },
          { id: 'B' },
        ],
      }),
    );
    expect(pick(rows, 'owner', 'priority', 'remarks')).toEqual([
      { owner: 'Ana', priority: 'high', remarks: 'Line one\nLine two' },
      { owner: '', priority: undefined, remarks: '' },
    ]);
  });

  it('handles an empty project', () => {
    expect(taskTable(makeProject())).toEqual([]);
  });
});
