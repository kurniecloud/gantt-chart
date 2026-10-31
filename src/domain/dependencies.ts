import { childrenByParent, descendantIds } from './tree';
import type { Project } from './types';

// Dependencies are finish-to-start links between tasks. A link to or from a parent task stands
// for links to or from every one of its leaf subtasks, so loops are checked on that expanded
// "leaf graph".

/** The tasks `taskId` depends on, in display order. */
export function predecessorIds(project: Project, taskId: string): string[] {
  const ids = new Set(
    Object.values(project.dependencies)
      .filter((dep) => dep.successorId === taskId)
      .map((dep) => dep.predecessorId),
  );
  return project.taskOrder.filter((id) => ids.has(id));
}

/** Parent, grandparent, … of a task (nearest first). */
export function ancestorIds(project: Project, taskId: string): string[] {
  const result: string[] = [];
  const seen = new Set([taskId]);
  let parentId = project.tasks[taskId]?.parentId ?? null;
  while (parentId && project.tasks[parentId] && !seen.has(parentId)) {
    result.push(parentId);
    seen.add(parentId);
    parentId = project.tasks[parentId]!.parentId;
  }
  return result;
}

/** For every task, the leaf tasks it stands for: itself if it has no subtasks. */
function leafIdsByTask(project: Project): Map<string, string[]> {
  const children = childrenByParent(project);
  const leaves = new Map<string, string[]>();
  const collect = (id: string): string[] => {
    const cached = leaves.get(id);
    if (cached) return cached;
    const kids = children.get(id);
    const result = kids ? kids.flatMap(collect) : [id];
    leaves.set(id, result);
    return result;
  };
  for (const id of project.taskOrder) if (project.tasks[id]) collect(id);
  return leaves;
}

/** Leaf → leaves that must wait for it, with parent links expanded to their subtasks. */
export function leafSuccessors(project: Project): Map<string, Set<string>> {
  const leaves = leafIdsByTask(project);
  const graph = new Map<string, Set<string>>();
  for (const dep of Object.values(project.dependencies)) {
    const from = leaves.get(dep.predecessorId);
    const to = leaves.get(dep.successorId);
    if (!from || !to) continue;
    for (const p of from) {
      for (const s of to) {
        if (p === s) continue;
        let set = graph.get(p);
        if (!set) graph.set(p, (set = new Set()));
        set.add(s);
      }
    }
  }
  return graph;
}

/**
 * Tasks that a task may depend on. Excludes the task itself, its parent chain, its subtasks, and
 * any task that already (directly or indirectly) waits for it — depending on one of those would
 * create a loop. For a task that doesn't exist yet, pass `taskId = null` and its parent.
 */
export function dependencyCandidates(
  project: Project,
  taskId: string | null,
  parentId: string | null,
): string[] {
  const excluded = new Set<string>();
  if (parentId) {
    excluded.add(parentId);
    ancestorIds(project, parentId).forEach((id) => excluded.add(id));
  }

  if (taskId) {
    excluded.add(taskId);
    ancestorIds(project, taskId).forEach((id) => excluded.add(id));
    descendantIds(project, taskId).forEach((id) => excluded.add(id));

    // Every leaf downstream of this task; a candidate containing one of them would close a loop.
    const graph = leafSuccessors(project);
    const start = leafIdsByTask(project).get(taskId) ?? [taskId];
    const downstream = new Set<string>();
    const queue = [...start];
    while (queue.length > 0) {
      for (const next of graph.get(queue.pop()!) ?? []) {
        if (downstream.has(next)) continue;
        downstream.add(next);
        queue.push(next);
      }
    }
    for (const leaf of downstream) {
      excluded.add(leaf);
      ancestorIds(project, leaf).forEach((id) => excluded.add(id));
    }
  }

  return project.taskOrder.filter((id) => project.tasks[id] && !excluded.has(id));
}
