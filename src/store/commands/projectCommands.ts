import type { Command } from './types';

/** Blank names are ignored, so the project always has a title. */
export function renameProject(name: string): Command {
  return {
    label: 'Rename project',
    apply: (project) => {
      const trimmed = name.trim();
      if (trimmed) project.name = trimmed;
    },
  };
}

export function setProjectDescription(description: string): Command {
  return {
    label: 'Edit description',
    apply: (project) => {
      project.description = description.trim();
    },
  };
}
