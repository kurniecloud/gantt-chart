import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { ancestorIds, dependencyCandidates, leafSuccessors, predecessorIds } from './dependencies';

// P
// ├─ A
// └─ B ── depends on A
// Q
// └─ C ── depends on B
// D
const project = () =>
  makeProject({
    tasks: [
      { id: 'P' },
      { id: 'A', parent: 'P' },
      { id: 'B', parent: 'P', deps: [{ from: 'A' }] },
      { id: 'Q' },
      { id: 'C', parent: 'Q', deps: [{ from: 'B' }] },
      { id: 'D' },
    ],
  });

describe('predecessorIds / ancestorIds', () => {
  it('lists what a task depends on, in display order', () => {
    expect(predecessorIds(project(), 'B')).toEqual(['A']);
    expect(predecessorIds(project(), 'A')).toEqual([]);
  });

  it('walks up the parent chain', () => {
    expect(ancestorIds(project(), 'C')).toEqual(['Q']);
    expect(ancestorIds(project(), 'P')).toEqual([]);
  });
});

describe('leafSuccessors', () => {
  it('expands links to and from parents into their leaf subtasks', () => {
    const p = makeProject({
      tasks: [
        { id: 'P' },
        { id: 'A', parent: 'P' },
        { id: 'B', parent: 'P' },
        { id: 'X', deps: [{ from: 'P' }] }, // X waits for all of P
      ],
    });
    const graph = leafSuccessors(p);
    expect([...(graph.get('A') ?? [])]).toEqual(['X']);
    expect([...(graph.get('B') ?? [])]).toEqual(['X']);
  });
});

describe('dependencyCandidates', () => {
  it('excludes the task, its parent chain and everything downstream of it', () => {
    // A → B → C. A may not depend on B or C (loop), on Q (it contains C), nor on its parent P.
    expect(dependencyCandidates(project(), 'A', 'P')).toEqual(['D']);
  });

  it('excludes subtasks of the task itself', () => {
    expect(dependencyCandidates(project(), 'P', null)).toEqual(['D']); // Q contains C, which waits on B
  });

  it('allows anything upstream or unrelated', () => {
    expect(dependencyCandidates(project(), 'C', 'Q')).toEqual(['P', 'A', 'B', 'D']);
  });

  it('for a new subtask excludes only its future parent chain', () => {
    expect(dependencyCandidates(project(), null, 'Q')).toEqual(['P', 'A', 'B', 'C', 'D']);
    expect(dependencyCandidates(project(), null, null)).toEqual(['P', 'A', 'B', 'Q', 'C', 'D']);
  });

  it('catches loops that go through a parent task', () => {
    // X depends on P (so on A); A may not depend on X.
    const p = makeProject({
      tasks: [{ id: 'P' }, { id: 'A', parent: 'P' }, { id: 'X', deps: [{ from: 'P' }] }],
    });
    expect(dependencyCandidates(p, 'A', 'P')).not.toContain('X');
  });
});
