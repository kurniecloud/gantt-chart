import type { Project } from './types';

/** Every owner named in the project, once each, alphabetically: suggestions for the Owner box. */
export function ownerNames(project: Project): string[] {
  const names = new Set<string>();
  for (const id of project.taskOrder) {
    const owner = project.tasks[id]?.owner;
    if (owner) names.add(owner);
  }
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
