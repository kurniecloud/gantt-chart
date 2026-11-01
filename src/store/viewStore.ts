import { create } from 'zustand';

export type ViewMode = 'daily' | 'weekly';

const MODE_KEY = 'gantt-chart:view-mode';
const ACTUAL_DATES_KEY = 'gantt-chart:show-actual-dates';

// Per-browser preferences, so localStorage rather than the project. Storage can be blocked
// (private mode, sandboxed previews), in which case the choice just isn't remembered.
function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered across visits; the view still changes.
  }
}

type ViewState = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  /** Whether the blue actual-dates lines are drawn. Remembered per browser; on by default. */
  showActualDates: boolean;
  toggleActualDates: () => void;
  /** Whether critical-path lines are drawn (recalculated live while on). Not remembered. */
  showCriticalPath: boolean;
  toggleCriticalPath: () => void;
  /** The critical path is being recalculated; input is blocked meanwhile. */
  recalculating: boolean;
  setRecalculating: (recalculating: boolean) => void;
};

export const useViewStore = create<ViewState>()((set) => ({
  mode: readSetting(MODE_KEY) === 'weekly' ? 'weekly' : 'daily',
  setMode: (mode) => {
    writeSetting(MODE_KEY, mode);
    set({ mode });
  },
  showActualDates: readSetting(ACTUAL_DATES_KEY) !== 'hidden',
  toggleActualDates: () =>
    set((state) => {
      const showActualDates = !state.showActualDates;
      writeSetting(ACTUAL_DATES_KEY, showActualDates ? 'shown' : 'hidden');
      return { showActualDates };
    }),
  showCriticalPath: false,
  toggleCriticalPath: () => set((state) => ({ showCriticalPath: !state.showCriticalPath })),
  recalculating: false,
  setRecalculating: (recalculating) => set({ recalculating }),
}));
