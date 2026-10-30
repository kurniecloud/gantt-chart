import type { Draft } from 'immer';
import type { Project } from '../../domain/types';

/**
 * One user intent ("Move task", "Add task"). `apply` mutates an immer draft; the store records
 * the resulting patches and their inverses, so undo/redo never needs hand-written reversal.
 * `apply` may be impure (e.g. generate ids) because redo replays patches, not `apply`.
 */
export type Command = {
  label: string;
  apply: (project: Draft<Project>) => void;
};
