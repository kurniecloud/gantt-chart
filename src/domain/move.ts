import { linkProblem } from './dependencies';
import { descendantIds } from './tree';
import type { Project } from './types';

/**
 * Where a dragged task should go, relative to a target row:
 * - `before` / `after`: a sibling just above the target / just after the target and its subtasks;
 * - `first-child` / `last-child`: the target's first / last subtask;
 * - `end`: the end of the list, at the top level.
 */
export type DropPlacement =
  { kind: 'before' | 'after' | 'first-child' | 'last-child'; targetId: string } | { kind: 'end' };

export type MovePlan =
  { ok: true; parentId: string | null; taskOrder: string[] } | { ok: false; reason: string };

/**
 * Works out a move without changing anything: the task's new parent and the new task order (the
 * task's subtasks travel with it). Refuses moves into the task's own subtree and moves that would
 * clash with links.
 */
export function planMove(project: Project, taskId: string, placement: DropPlacement): MovePlan {
  const task = project.tasks[taskId];
  if (!task) return { ok: false, reason: 'That task no longer exists.' };
  const subtree = [taskId, ...descendantIds(project, taskId)];
  const moving = new Set(subtree);

  let parentId: string | null = null;
  if (placement.kind !== 'end') {
    const target = project.tasks[placement.targetId];
    if (!target) return { ok: false, reason: 'That task no longer exists.' };
    if (moving.has(placement.targetId)) {
      return { ok: false, reason: 'A task can’t be moved inside itself or its own subtasks.' };
    }
    parentId =
      placement.kind === 'before' || placement.kind === 'after'
        ? target.parentId
        : placement.targetId;
  }

  const rest = project.taskOrder.filter((id) => !moving.has(id));
  let index = rest.length;
  if (placement.kind === 'before') index = rest.indexOf(placement.targetId);
  else if (placement.kind === 'first-child') index = rest.indexOf(placement.targetId) + 1;
  else if (placement.kind === 'after' || placement.kind === 'last-child') {
    const targetSubtree = [
      placement.targetId,
      ...descendantIds(project, placement.targetId).filter((id) => !moving.has(id)),
    ];
    index = rest.indexOf(targetSubtree.at(-1)!) + 1;
  }
  const taskOrder = [...rest.slice(0, index), ...subtree, ...rest.slice(index)];

  if (parentId !== task.parentId) {
    const moved: Project = {
      ...project,
      taskOrder,
      tasks: { ...project.tasks, [taskId]: { ...task, parentId } },
    };
    const problem = linkProblem(moved);
    if (problem) return { ok: false, reason: problem };
  }
  return { ok: true, parentId, taskOrder };
}
