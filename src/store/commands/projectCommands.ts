import type { Project } from '../../domain/types';
import type { Command } from './types';

/** Blank names are ignored, so the project always has a title. */
export function renameProject(name: string): Command {
  return {
    label: 'Rename Project',
    apply: (project) => {
      const trimmed = name.trim();
      if (trimmed) project.name = trimmed;
    },
  };
}

export function setProjectDescription(description: string): Command {
  return {
    label: 'Edit Description',
    apply: (project) => {
      project.description = description.trim();
    },
  };
}

/**
 * Replaces everything in the open project — title, description, tasks, dependencies,
 * milestones — with an imported project's. Keeps the open project's id, so it is overwritten
 * in storage rather than saved alongside. Undo restores the previous content.
 */
export function importProject(imported: Project): Command {
  return {
    label: 'Import Project',
    apply: (project) => {
      const { id, schemaVersion, ...content } = imported;
      Object.assign(project, structuredClone(content));
    },
  };
}
