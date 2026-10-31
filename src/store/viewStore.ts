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
}));
