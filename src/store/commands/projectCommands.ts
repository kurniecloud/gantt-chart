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
 * Replaces everything in the open project — title, description, tasks, dependencies, milestones.
 * Keeps the open project's id, so it is overwritten in storage rather than saved alongside. Undo
 * restores the previous content.
 */
function replaceContent(label: string, replacement: Project): Command {
  return {
    label,
    apply: (project) => {
      const { id, schemaVersion, ...content } = replacement;
      Object.assign(project, structuredClone(content));
    },
  };
}

/** A project read from an imported file (already checked by `parseProjectFile`). */
export function importProject(imported: Project): Command {
  return replaceContent('Import Project', imported);
}

/** Empties the open project, leaving what a first launch creates. */
export function clearProject(today: ISODate): Command {
  return replaceContent('New Project', createProject(DEFAULT_PROJECT_NAME, today));
}

/** The text saved in the JSON Editor (already checked by `parseProjectFile`). */
export function saveProjectJson(edited: Project): Command {
  return replaceContent('Edit JSON', edited);
}
