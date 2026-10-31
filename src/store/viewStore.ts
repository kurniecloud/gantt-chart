import { create } from 'zustand';

export type ViewMode = 'daily' | 'weekly';

const STORAGE_KEY = 'gantt-chart:view-mode';

// A per-browser preference, so localStorage rather than the project. Storage can be blocked
// (private mode, sandboxed previews), in which case the choice just isn't remembered.
function readMode(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'weekly' ? 'weekly' : 'daily';
  } catch {
    return 'daily';
  }
}

type ViewState = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  /** Whether critical-path lines are drawn (recalculated live while on). Not remembered. */
  showCriticalPath: boolean;
  toggleCriticalPath: () => void;
  /** The critical path is being recalculated; input is blocked meanwhile. */
  recalculating: boolean;
  setRecalculating: (recalculating: boolean) => void;
};

export const useViewStore = create<ViewState>()((set) => ({
  mode: readMode(),
  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Not remembered across visits; the view still switches.
    }
    set({ mode });
  },
  showCriticalPath: false,
  toggleCriticalPath: () => set((state) => ({ showCriticalPath: !state.showCriticalPath })),
  recalculating: false,
  setRecalculating: (recalculating) => set({ recalculating }),
}));
