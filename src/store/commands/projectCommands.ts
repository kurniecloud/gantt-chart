import { createTask } from '../../domain/project';
import type { Command } from './types';

export function renameProject(name: string): Command {
  return {
    label: 'Rename project',
    apply: (project) => {
      const trimmed = name.trim();
      if (trimmed) project.name = trimmed;
    },
  };
}

/** Appends a 1-day top-level task starting on the project start date. */
export function addTask(name = 'New task'): Command {
  return {
    label: 'Add task',
    apply: (project) => {
      const task = createTask(project, { name });
      project.tasks[task.id] = task;
      project.taskOrder.push(task.id);
    },
  };
}
