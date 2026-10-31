import styles from './App.module.css';
import { AppDialogs } from './features/dialogs/AppDialogs';
import { ProjectHeader } from './features/header/ProjectHeader';
import { useUndoRedoShortcuts } from './features/header/useUndoRedoShortcuts';
import { Workspace } from './features/workspace/Workspace';

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
      <main className={styles.main}>
        <Workspace />
      </main>
      <AppDialogs />
    </div>
  );
}
