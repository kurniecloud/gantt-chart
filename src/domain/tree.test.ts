import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { childrenByParent, descendantIds, insertionIndexForChild, visibleTaskRows } from './tree';

// A
// ├─ A1
// │  └─ A1a
// └─ A2
// B
const nested = (collapsed: string[] = []) =>
  makeProject({
    tasks: [
      { id: 'A' },
      { id: 'A1', parent: 'A' },
      { id: 'A1a', parent: 'A1' },
      { id: 'A2', parent: 'A' },
      { id: 'B' },
    ].map((t) => ({ ...t, collapsed: collapsed.includes(t.id) })),
  });

describe('childrenByParent', () => {
  it('groups children in display order', () => {
    const map = childrenByParent(nested());
    expect(map.get(null)).toEqual(['A', 'B']);
    expect(map.get('A')).toEqual(['A1', 'A2']);
    expect(map.get('A1')).toEqual(['A1a']);
    expect(map.has('B')).toBe(false);
  });

  it('treats tasks whose parent is missing as top level', () => {
    const project = makeProject({ tasks: [{ id: 'X', parent: 'gone' }] });
    expect(childrenByParent(project).get(null)).toEqual(['X']);
  });
});

describe('descendantIds', () => {
  it.each([
    ['A', ['A1', 'A1a', 'A2']],
    ['A1', ['A1a']],
    ['A1a', []],
    ['B', []],
  ])('%s → %j', (id, expected) => {
    expect(descendantIds(nested(), id)).toEqual(expected);
  });
});

describe('insertionIndexForChild', () => {
  it.each([
    [null, 5], // end of the list
    ['A', 4], // after A2, A's last descendant
    ['A1', 3], // after A1a
    ['A1a', 3], // straight after A1a (no children yet)
    ['B', 5],
  ])('parent %s → index %i', (parentId, expected) => {
    expect(insertionIndexForChild(nested(), parentId)).toBe(expected);
  });
});

describe('visibleTaskRows', () => {
  it('lists every task with its depth when all are expanded', () => {
    expect(visibleTaskRows(nested())).toEqual([
      { id: 'A', depth: 0, hasChildren: true, expanded: true },
      { id: 'A1', depth: 1, hasChildren: true, expanded: true },
      { id: 'A1a', depth: 2, hasChildren: false, expanded: false },
      { id: 'A2', depth: 1, hasChildren: false, expanded: false },
      { id: 'B', depth: 0, hasChildren: false, expanded: false },
    ]);
  });

  it('hides the descendants of collapsed tasks', () => {
    expect(visibleTaskRows(nested(['A1'])).map((r) => r.id)).toEqual(['A', 'A1', 'A2', 'B']);
    expect(visibleTaskRows(nested(['A'])).map((r) => r.id)).toEqual(['A', 'B']);
  });

  it('marks a collapsed parent as not expanded', () => {
    expect(visibleTaskRows(nested(['A']))[0]).toMatchObject({ hasChildren: true, expanded: false });
  });

  it('handles an empty project', () => {
    expect(visibleTaskRows(makeProject())).toEqual([]);
  });
});
