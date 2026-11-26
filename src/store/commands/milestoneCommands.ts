import { sortByDate } from '../../domain/milestones';
import type { Milestone } from '../../domain/types';
import type { Command } from './types';

/**
 * Replaces all milestones, sorted by date (same-day milestones keep the given order) — one
 * undoable step for the whole dialog.
 */
export function setMilestones(milestones: Milestone[]): Command {
  return {
    label: 'Edit Milestones',
    apply: (project) => {
      project.milestones = sortByDate(milestones);
    },
  };
}
