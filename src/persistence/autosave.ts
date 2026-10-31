import { todayISO } from '../domain/dates';
import { DEFAULT_PROJECT_NAME, createProject } from '../domain/project';
import type { Project } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { getLastOpenedId, loadProject, saveProject, setLastOpenedId } from './db';

export const AUTOSAVE_DELAY_MS = 500;

/**
 * Opens the last project the user worked on, or creates an empty project on first launch.
 * `persistent` is false when IndexedDB is unavailable (e.g. some private-browsing modes).
 */
export async function loadInitialProject(): Promise<{ project: Project; persistent: boolean }> {
  try {
    const lastId = await getLastOpenedId();
    const existing = lastId ? await loadProject(lastId) : undefined;
    if (existing) return { project: existing, persistent: true };

    const project = createProject(DEFAULT_PROJECT_NAME, todayISO());
    await saveProject(project);
    await setLastOpenedId(project.id);
    return { project, persistent: true };
  } catch (error) {
    console.warn('Browser storage is unavailable; changes will not be saved.', error);
    return { project: createProject(DEFAULT_PROJECT_NAME, todayISO()), persistent: false };
  }
}

/** Saves the open project shortly after each change and when the page is hidden. Returns a stop function. */
export function startAutosave(delayMs = AUTOSAVE_DELAY_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Project | null = null;

  const flush = () => {
    clearTimeout(timer);
    if (!pending) return;
    const project = pending;
    pending = null;
    Promise.all([saveProject(project), setLastOpenedId(project.id)]).catch((error: unknown) => {
      console.error('Autosave failed', error);
    });
  };

  const unsubscribe = useProjectStore.subscribe((state, previous) => {
    if (state.project === previous.project) return;
    pending = state.project;
    clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  });

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', flush);

  return () => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', flush);
    flush();
  };
}
