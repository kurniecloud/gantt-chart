import type { Milestone } from '../../domain/types';
import type { Command } from './types';

/** Replaces all milestones (sorted by date, then name) — one undoable step for the whole dialog. */
export function setMilestones(milestones: Milestone[]): Command {
  return {
    label: 'Edit milestones',
    apply: (project) => {
      project.milestones = [...milestones].sort(
        (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
      );
    },
  };
}
