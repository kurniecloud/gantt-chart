import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import { create } from 'zustand';
import { createProject } from '../domain/project';
import type { Project } from '../domain/types';
import type { Command } from './commands/types';

enablePatches();

export const HISTORY_LIMIT = 200;

type HistoryEntry = {
  label: string;
  patches: Patch[];
  inversePatches: Patch[];
};

type ProjectState = {
  project: Project;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Replaces the open project and clears undo history. */
  loadProject: (project: Project) => void;
  dispatch: (command: Command) => void;
  undo: () => void;
  redo: () => void;
};

export const useProjectStore = create<ProjectState>()((set, get) => ({
  project: createProject('Untitled project', '1970-01-01'),
  past: [],
  future: [],

  loadProject: (project) => set({ project, past: [], future: [] }),

  dispatch: (command) => {
    const [project, patches, inversePatches] = produceWithPatches(get().project, command.apply);
    if (patches.length === 0) return;
    const entry = { label: command.label, patches, inversePatches };
    set((state) => ({
      project,
      past: [...state.past, entry].slice(-HISTORY_LIMIT),
      future: [],
    }));
  },

  undo: () => {
    const { past, future, project } = get();
    const entry = past[past.length - 1];
    if (!entry) return;
    set({
      project: applyPatches(project, entry.inversePatches),
      past: past.slice(0, -1),
      future: [entry, ...future],
    });
  },

  redo: () => {
    const { past, future, project } = get();
    const entry = future[0];
    if (!entry) return;
    set({
      project: applyPatches(project, entry.patches),
      past: [...past, entry],
      future: future.slice(1),
    });
  },
}));

export const selectCanUndo = (s: ProjectState) => s.past.length > 0;
export const selectCanRedo = (s: ProjectState) => s.future.length > 0;
export const selectUndoLabel = (s: ProjectState) => s.past[s.past.length - 1]?.label;
export const selectRedoLabel = (s: ProjectState) => s.future[0]?.label;
