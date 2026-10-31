import type { Draft } from 'immer';
import { newId } from '../../domain/ids';
import { createTask, type TaskFields } from '../../domain/project';
import { descendantIds, insertionIndexForChild } from '../../domain/tree';
import type { Project } from '../../domain/types';
import type { Command } from './types';

/** Makes `taskId` depend on exactly `predecessorIds` (finish-to-start), keeping existing links. */
function setPredecessors(project: Draft<Project>, taskId: string, predecessorIds: string[]) {
  const wanted = new Set(predecessorIds.filter((id) => id !== taskId && project.tasks[id]));
  for (const [depId, dep] of Object.entries(project.dependencies)) {
    if (dep.successorId !== taskId) continue;
    if (wanted.has(dep.predecessorId)) wanted.delete(dep.predecessorId);
    else delete project.dependencies[depId];
  }
  for (const predecessorId of wanted) {
    const id = newId();
    project.dependencies[id] = { id, predecessorId, successorId: taskId, type: 'FS', lagDays: 0 };
  }
}

/**
 * Adds a task at the end of the list, or — with `parentId` — as the last subtask of that task,
 * expanding the parent so the new subtask is visible. Pass `id` to know the new task's id.
 * `predecessorIds` are the tasks it depends on.
 */
export function addTask(
  fields: TaskFields,
  parentId: string | null = null,
  id = newId(),
  predecessorIds: string[] = [],
): Command {
  return {
    label: parentId ? 'Add subtask' : 'Add task',
    apply: (project) => {
      if (parentId !== null && !project.tasks[parentId]) return;
      const index = insertionIndexForChild(project, parentId);
      project.tasks[id] = createTask(fields, parentId, id);
      project.taskOrder.splice(index, 0, id);
      if (parentId !== null) delete project.tasks[parentId]!.collapsed;
      setPredecessors(project, id, predecessorIds);
    },
  };
}

/**
 * Replaces the task's name, dates and priority (absent optional fields are cleared) and, when
 * given, the tasks it depends on.
 */
export function updateTask(id: string, fields: TaskFields, predecessorIds?: string[]): Command {
  return {
    label: 'Edit task',
    apply: (project) => {
      const task = project.tasks[id];
      if (!task) return;
      if (predecessorIds) setPredecessors(project, id, predecessorIds);
      task.name = fields.name;
      if (fields.start) task.start = fields.start;
      else delete task.start;
      if (fields.finish) task.finish = fields.finish;
      else delete task.finish;
      if (fields.priority) task.priority = fields.priority;
      else delete task.priority;
    },
  };
}

/** Deletes the task, all of its subtasks, and any links or assignments that point at them. */
export function deleteTask(id: string): Command {
  return {
    label: 'Delete task',
    apply: (project) => {
      if (!project.tasks[id]) return;
      const doomed = new Set([id, ...descendantIds(project, id)]);
      for (const taskId of doomed) delete project.tasks[taskId];
      project.taskOrder = project.taskOrder.filter((taskId) => !doomed.has(taskId));
      for (const [depId, dep] of Object.entries(project.dependencies)) {
        if (doomed.has(dep.predecessorId) || doomed.has(dep.successorId)) {
          delete project.dependencies[depId];
        }
      }
      for (const [assignmentId, assignment] of Object.entries(project.assignments)) {
        if (doomed.has(assignment.taskId)) delete project.assignments[assignmentId];
      }
    },
  };
}
