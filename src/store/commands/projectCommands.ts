import { DEFAULT_PROJECT_NAME, createProject } from '../../domain/project';
import type { ISODate, Project } from '../../domain/types';
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

/**
 * Empties the open project, leaving what a first launch creates. Keeps the project's id, so it is
 * overwritten in storage rather than leaving the old one behind. Undo restores the content.
 */
export function clearProject(today: ISODate): Command {
  return {
    label: 'New Project',
    apply: (project) => {
      const { id, schemaVersion, ...content } = createProject(DEFAULT_PROJECT_NAME, today);
      Object.assign(project, content);
    },
  };
}
