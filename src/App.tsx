import styles from './App.module.css';
import { TaskGrid } from './features/grid/TaskGrid';
import { Timeline } from './features/timeline/Timeline';
import { Toolbar } from './features/toolbar/Toolbar';
import { useUndoRedoShortcuts } from './features/toolbar/useUndoRedoShortcuts';

type AppProps = {
  storageAvailable: boolean;
};

export function App({ storageAvailable }: AppProps) {
  useUndoRedoShortcuts();

  return (
    <div className={styles.app}>
      <Toolbar />
      {!storageAvailable && (
        <div role="status" className={styles.banner}>
          Browser storage is unavailable, so changes won’t be saved. Export your project before
          closing this tab.
        </div>
      )}
      <main className={styles.workspace}>
        <section className={styles.gridPane} aria-label="Task list">
          <TaskGrid />
        </section>
        <section className={styles.timelinePane} aria-label="Timeline">
          <Timeline />
        </section>
      </main>
    </div>
  );
}
