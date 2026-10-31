import styles from './App.module.css';
import { TaskDialogs } from './features/dialogs/TaskDialogs';
import { ProjectHeader } from './features/header/ProjectHeader';
import { useUndoRedoShortcuts } from './features/header/useUndoRedoShortcuts';
import { TaskList } from './features/tasks/TaskList';
import { Timeline } from './features/timeline/Timeline';

type AppProps = {
  storageAvailable: boolean;
};

export function App({ storageAvailable }: AppProps) {
  useUndoRedoShortcuts();

  return (
    <div className={styles.app}>
      <ProjectHeader />
      {!storageAvailable && (
        <div role="status" className={styles.banner}>
          Browser storage is unavailable, so changes won’t be saved when you close this tab.
        </div>
      )}
      <main className={styles.workspace}>
        <section className={styles.taskPane} aria-label="Task list">
          <TaskList />
        </section>
        <section className={styles.timelinePane} aria-label="Timeline">
          <Timeline />
        </section>
      </main>
      <TaskDialogs />
    </div>
  );
}
