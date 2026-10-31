import type { Project } from './types';

// Hierarchy comes from `Task.parentId`; sibling order comes from `Project.taskOrder`, which
// commands keep in pre-order (every task is followed by all of its descendants).

export type TaskRow = {
  id: string;
  /** 0 = top level. */
  depth: number;
  hasChildren: boolean;
  /** True when the task has children and is not collapsed. */
  expanded: boolean;
};

/** Child ids per parent id (`null` = top level), in `taskOrder` order. Orphans count as top level. */
export function childrenByParent(project: Project): Map<string | null, string[]> {
  const map = new Map<string | null, string[]>();
  for (const id of project.taskOrder) {
    const task = project.tasks[id];
    if (!task) continue;
    const parentId = task.parentId && project.tasks[task.parentId] ? task.parentId : null;
    const siblings = map.get(parentId);
    if (siblings) siblings.push(id);
    else map.set(parentId, [id]);
  }
  return map;
}

/** Every descendant of `id` in display order (children before grandchildren of later siblings). */
export function descendantIds(project: Project, id: string): string[] {
  const children = childrenByParent(project);
  const result: string[] = [];
  const stack = [...(children.get(id) ?? [])].reverse();
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    stack.push(...[...(children.get(current) ?? [])].reverse());
  }
  return result;
}

/** Where in `taskOrder` a new last child of `parentId` goes (`null` = end of the list). */
export function insertionIndexForChild(project: Project, parentId: string | null): number {
  if (parentId === null) return project.taskOrder.length;
  const subtree = [parentId, ...descendantIds(project, parentId)];
  return project.taskOrder.indexOf(subtree[subtree.length - 1]!) + 1;
}

/** The rows to display: every task whose ancestors are all expanded, in display order. */
export function visibleTaskRows(project: Project): TaskRow[] {
  const children = childrenByParent(project);
  const rows: TaskRow[] = [];
  const stack = [...(children.get(null) ?? [])].reverse().map((id) => ({ id, depth: 0 }));
  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    const childIds = children.get(id) ?? [];
    const hasChildren = childIds.length > 0;
    const expanded = hasChildren && !project.tasks[id]?.collapsed;
    rows.push({ id, depth, hasChildren, expanded });
    if (expanded) {
      for (let i = childIds.length - 1; i >= 0; i--) {
        stack.push({ id: childIds[i]!, depth: depth + 1 });
      }
    }
  }
  return rows;
}
