import { childrenByParent, descendantIds } from './tree';
import type { Project } from './types';

// Dependencies are finish-to-start "blocking" links: the predecessor blocks the successor, which
// can only start once the predecessor has finished. A link to or from a parent task stands for
// links to or from every one of its leaf subtasks, so loops are checked on that expanded
// "leaf graph".

type Link = { from: string; to: string };

/** The tasks blocking `taskId` (it "is blocked by" them), in display order. */
export function predecessorIds(project: Project, taskId: string): string[] {
  const ids = new Set(
    Object.values(project.dependencies)
      .filter((dep) => dep.successorId === taskId)
      .map((dep) => dep.predecessorId),
  );
  return project.taskOrder.filter((id) => ids.has(id));
}

/** The tasks `taskId` is blocking (they wait for it), in display order. */
export function successorIds(project: Project, taskId: string): string[] {
  const ids = new Set(
    Object.values(project.dependencies)
      .filter((dep) => dep.predecessorId === taskId)
      .map((dep) => dep.successorId),
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

/** Expands links between tasks into links between their leaves (leaf → leaves it blocks). */
function leafGraph(leaves: Map<string, string[]>, links: Link[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const { from, to } of links) {
    for (const p of leaves.get(from) ?? []) {
      for (const s of leaves.get(to) ?? []) {
        if (p === s) continue;
        let set = graph.get(p);
        if (!set) graph.set(p, (set = new Set()));
        set.add(s);
      }
    }
  }
  return graph;
}

function projectLinks(project: Project): Link[] {
  return Object.values(project.dependencies).map((dep) => ({
    from: dep.predecessorId,
    to: dep.successorId,
  }));
}

/** Leaf → leaves that must wait for it, with parent links expanded to their subtasks. */
export function leafSuccessors(project: Project): Map<string, Set<string>> {
  return leafGraph(leafIdsByTask(project), projectLinks(project));
}

/** Every node reachable from `start` (not counting `start` itself unless it's on a loop). */
function reachable(graph: Map<string, Set<string>>, start: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...start];
  while (queue.length > 0) {
    for (const next of graph.get(queue.pop()!) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function reversed(graph: Map<string, Set<string>>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const [from, tos] of graph) {
    for (const to of tos) {
      let set = result.get(to);
      if (!set) result.set(to, (set = new Set()));
      set.add(from);
    }
  }
  return result;
}

const NEW_TASK = '\u0000new-task';

/**
 * The tasks that may be chosen in the dialog's two link fields, given what is already chosen
 * there (`draft`). A task can't be linked to itself, its parent chain or its subtasks, and
 * nothing may close a loop — including loops through parent tasks and through the other field.
 * For a task that doesn't exist yet, pass `taskId = null` and its future parent.
 */
export function linkCandidates(
  project: Project,
  taskId: string | null,
  parentId: string | null,
  draft: { blockedBy: string[]; blocking: string[] },
): { blockedBy: string[]; blocking: string[] } {
  const self = taskId ?? NEW_TASK;
  const related = new Set<string>([self]);
  const chainStart = taskId ?? parentId;
  if (parentId) related.add(parentId);
  if (chainStart) ancestorIds(project, chainStart).forEach((id) => related.add(id));
  if (taskId) descendantIds(project, taskId).forEach((id) => related.add(id));

  // The project's links with this task's own links replaced by the draft.
  const links = projectLinks(project).filter((l) => l.from !== self && l.to !== self);
  draft.blockedBy.forEach((id) => links.push({ from: id, to: self }));
  draft.blocking.forEach((id) => links.push({ from: self, to: id }));

  const leaves = leafIdsByTask(project);
  if (!taskId) leaves.set(NEW_TASK, [NEW_TASK]);
  const graph = leafGraph(leaves, links);
  const selfLeaves = leaves.get(self) ?? [self];

  /** Excludes every task containing one of `found` (the leaves themselves and their parents). */
  const containing = (found: Set<string>) => {
    const ids = new Set<string>();
    for (const leaf of found) {
      ids.add(leaf);
      ancestorIds(project, leaf).forEach((id) => ids.add(id));
    }
    return ids;
  };
  // Blocked by X is a loop if X already waits (directly or not) for this task, and vice versa.
  const downstream = containing(reachable(graph, selfLeaves));
  const upstream = containing(reachable(reversed(graph), selfLeaves));

  const allowed = (excluded: Set<string>) =>
    project.taskOrder.filter((id) => project.tasks[id] && !related.has(id) && !excluded.has(id));
  return { blockedBy: allowed(downstream), blocking: allowed(upstream) };
}
