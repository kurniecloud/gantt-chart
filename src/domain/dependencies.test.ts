import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import {
  ancestorIds,
  leafSuccessors,
  linkCandidates,
  predecessorIds,
  successorIds,
} from './dependencies';

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

const none = { blockedBy: [], blocking: [] };
/** What the dialog starts with: the task's current links on both sides. */
const current = (p: ReturnType<typeof project>, id: string) => ({
  blockedBy: predecessorIds(p, id),
  blocking: successorIds(p, id),
});
const candidates = (p: ReturnType<typeof project>, id: string, parentId: string | null) =>
  linkCandidates(p, id, parentId, current(p, id));

describe('successorIds', () => {
  it('lists the tasks waiting for a task', () => {
    expect(successorIds(project(), 'A')).toEqual(['B']);
    expect(successorIds(project(), 'C')).toEqual([]);
  });
});

describe('linkCandidates', () => {
  it('“is blocked by”: excludes the task, its parent chain and everything downstream', () => {
    // A → B → C. A may not be blocked by B or C (loop), by Q (it contains C), nor by its parent P.
    expect(candidates(project(), 'A', 'P').blockedBy).toEqual(['D']);
  });

  it('“is blocking”: excludes everything upstream', () => {
    // C waits for B, which waits for A: C can't block A, B or their parent P.
    expect(candidates(project(), 'C', 'Q').blocking).toEqual(['D']);
    expect(candidates(project(), 'A', 'P').blocking).toEqual(['B', 'Q', 'C', 'D']); // B: already chosen, the dialog hides it
  });

  it('excludes subtasks of the task itself', () => {
    expect(candidates(project(), 'P', null).blockedBy).toEqual(['D']); // Q contains C
  });

  it('allows anything upstream for “is blocked by”', () => {
    expect(candidates(project(), 'C', 'Q').blockedBy).toEqual(['P', 'A', 'B', 'D']);
  });

  it('for a new subtask excludes only its future parent chain', () => {
    const all = linkCandidates(project(), null, 'Q', none);
    expect(all.blockedBy).toEqual(['P', 'A', 'B', 'C', 'D']);
    expect(all.blocking).toEqual(['P', 'A', 'B', 'C', 'D']);
  });

  it('treats the draft as the task’s complete set of links (removing one frees it up)', () => {
    // Without its link to B, A may now be blocked by B.
    expect(linkCandidates(project(), 'A', 'P', none).blockedBy).toContain('B');
  });

  it('takes the other field’s choices into account', () => {
    // New task blocked by D: D can no longer appear under “is blocking”, and vice versa.
    expect(
      linkCandidates(project(), null, null, { blockedBy: ['D'], blocking: [] }).blocking,
    ).not.toContain('D');
    expect(
      linkCandidates(project(), null, null, { blockedBy: [], blocking: ['A'] }).blockedBy,
    ).not.toContain('B'); // B waits on A
  });

  it('catches loops that go through a parent task', () => {
    // X is blocked by P (so by A); A may not be blocked by X.
    const p = makeProject({
      tasks: [{ id: 'P' }, { id: 'A', parent: 'P' }, { id: 'X', deps: [{ from: 'P' }] }],
    });
    expect(candidates(p, 'A', 'P').blockedBy).not.toContain('X');
    expect(candidates(p, 'X', null).blocking).not.toContain('A');
  });
});
