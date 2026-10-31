import { newId } from '../../domain/ids';
import { createTask, type TaskFields } from '../../domain/project';
import { descendantIds, insertionIndexForChild } from '../../domain/tree';
import type { Command } from './types';

/**
 * Adds a task at the end of the list, or — with `parentId` — as the last subtask of that task,
 * expanding the parent so the new subtask is visible. Pass `id` to know the new task's id.
 */
export function addTask(fields: TaskFields, parentId: string | null = null, id = newId()): Command {
  return {
    label: parentId ? 'Add subtask' : 'Add task',
    apply: (project) => {
      if (parentId !== null && !project.tasks[parentId]) return;
      const index = insertionIndexForChild(project, parentId);
      project.tasks[id] = createTask(fields, parentId, id);
      project.taskOrder.splice(index, 0, id);
      if (parentId !== null) delete project.tasks[parentId]!.collapsed;
    },
  };
}

/** Replaces the task's name, dates and priority; absent optional fields are cleared. */
export function updateTask(id: string, fields: TaskFields): Command {
  return {
    label: 'Edit task',
    apply: (project) => {
      const task = project.tasks[id];
      if (!task) return;
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
