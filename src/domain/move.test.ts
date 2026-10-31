import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { planMove, type DropPlacement } from './move';

// A
// ├─ A1
// │  └─ A1a
// └─ A2
// B
// C
const tree = (extra: Parameters<typeof makeProject>[0] = {}) =>
  makeProject({
    tasks: [
      { id: 'A' },
      { id: 'A1', parent: 'A' },
      { id: 'A1a', parent: 'A1' },
      { id: 'A2', parent: 'A' },
      { id: 'B' },
      { id: 'C' },
    ],
    ...extra,
  });

const plan = (taskId: string, placement: DropPlacement, project = tree()) =>
  planMove(project, taskId, placement);

describe('planMove', () => {
  it.each<[string, string, DropPlacement, string | null, string[]]>([
    [
      'moves a task above another',
      'C',
      { kind: 'before', targetId: 'B' },
      null,
      ['A', 'A1', 'A1a', 'A2', 'C', 'B'],
    ],
    [
      'moves a task below another (after its subtasks)',
      'B',
      { kind: 'after', targetId: 'C' },
      null,
      ['A', 'A1', 'A1a', 'A2', 'C', 'B'],
    ],
    [
      'makes a task the last subtask of another',
      'C',
      { kind: 'last-child', targetId: 'A' },
      'A',
      ['A', 'A1', 'A1a', 'A2', 'C', 'B'],
    ],
    [
      'makes a task the first subtask of another',
      'C',
      { kind: 'first-child', targetId: 'A' },
      'A',
      ['A', 'C', 'A1', 'A1a', 'A2', 'B'],
    ],
    [
      'moves a subtree, children following',
      'A1',
      { kind: 'after', targetId: 'C' },
      null,
      ['A', 'A2', 'B', 'C', 'A1', 'A1a'],
    ],
    [
      'turns a subtask into a top-level task',
      'A1a',
      { kind: 'before', targetId: 'B' },
      null,
      ['A', 'A1', 'A2', 'A1a', 'B', 'C'],
    ],
    [
      'moves a subtask under a different parent',
      'A2',
      { kind: 'last-child', targetId: 'B' },
      'B',
      ['A', 'A1', 'A1a', 'B', 'A2', 'C'],
    ],
    ['moves a task to the end', 'A', { kind: 'end' }, null, ['B', 'C', 'A', 'A1', 'A1a', 'A2']],
    [
      'moves a subtask out to just after its parent',
      'A1',
      { kind: 'after', targetId: 'A' },
      null,
      ['A', 'A2', 'A1', 'A1a', 'B', 'C'],
    ],
  ])('%s', (_label, taskId, placement, parentId, order) => {
    expect(plan(taskId, placement)).toEqual({ ok: true, parentId, taskOrder: order });
  });

  it.each<[string, DropPlacement]>([
    ['onto itself', { kind: 'last-child', targetId: 'A' }],
    ['into its own child', { kind: 'last-child', targetId: 'A1' }],
    ['into a deeper descendant', { kind: 'first-child', targetId: 'A1a' }],
    ['level with its own children', { kind: 'before', targetId: 'A2' }],
  ])('refuses moving a parent %s', (_label, placement) => {
    expect(plan('A', placement)).toEqual({
      ok: false,
      reason: 'A task can’t be moved inside itself or its own subtasks.',
    });
  });

  it('refuses a move that puts a task inside a task it is linked to', () => {
    const project = makeProject({
      tasks: [
        { id: 'P', name: 'Planning' },
        { id: 'X', name: 'Review', deps: [{ from: 'P' }] },
      ],
    });
    const result = planMove(project, 'X', { kind: 'last-child', targetId: 'P' });
    expect(result).toEqual({
      ok: false,
      reason: '“Planning” and “Review” are linked, so one can’t be inside the other.',
    });
  });

  it('refuses a move that would make a loop through a parent', () => {
    // X blocks Y, and Y blocks Q. Moving X inside Q would make Y block X too.
    const project = makeProject({
      tasks: [
        { id: 'Q' },
        { id: 'Q1', parent: 'Q' },
        { id: 'X' },
        { id: 'Y', deps: [{ from: 'X' }] },
      ],
    });
    project.dependencies['Y->Q'] = {
      id: 'Y->Q',
      predecessorId: 'Y',
      successorId: 'Q',
      type: 'FS',
      lagDays: 0,
    };
    expect(planMove(project, 'X', { kind: 'last-child', targetId: 'Q' })).toEqual({
      ok: false,
      reason: 'That would make a loop of blocking links.',
    });
  });

  it('allows reordering among siblings even when links exist', () => {
    const project = makeProject({ tasks: [{ id: 'A' }, { id: 'B', deps: [{ from: 'A' }] }] });
    expect(planMove(project, 'B', { kind: 'before', targetId: 'A' })).toMatchObject({ ok: true });
  });
});
