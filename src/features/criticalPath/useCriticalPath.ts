import { useEffect, useState } from 'react';
import { criticalPath, type CriticalPathResult } from '../../domain/criticalPath';
import type { Project } from '../../domain/types';
import { useViewStore } from '../../store/viewStore';

/**
 * The critical path, recalculated after every change while `enabled`. Each recalculation marks
 * the app as busy (`recalculating` in the view store) so input is blocked until it's done; it runs
 * in a task of its own so the blocking layer is on screen first.
 */
export function useCriticalPath(project: Project, enabled: boolean): CriticalPathResult | null {
  const [computed, setComputed] = useState<{
    project: Project;
    result: CriticalPathResult;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const { setRecalculating } = useViewStore.getState();
    setRecalculating(true);
    const timer = setTimeout(() => {
      setComputed({ project, result: criticalPath(project) });
      setRecalculating(false);
    }, 0);
    return () => {
      clearTimeout(timer);
      setRecalculating(false);
    };
  }, [enabled, project]);

  // Until the new result is in, the previous one stays on screen (input is blocked meanwhile).
  return enabled ? (computed?.result ?? null) : null;
}
