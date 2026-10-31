import { Button } from '../../components/Button';
import { Dialog, DialogActions } from '../../components/Dialog';
import type { Project } from '../../domain/types';
import { importProject } from '../../store/commands/projectCommands';
import { useProjectStore } from '../../store/projectStore';
import styles from './TaskDialog.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function count(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

type ConfirmImportDialogProps = {
  fileName: string;
  project: Project;
  onClose: () => void;
};

export function ConfirmImportDialog({ fileName, project, onClose }: ConfirmImportDialogProps) {
  const current = useProjectStore((s) => s.project);
  const dispatch = useProjectStore((s) => s.dispatch);

  return (
    <Dialog title={`Import “${fileName}”?`} onClose={onClose}>
      <div className={styles.form}>
        <p className={styles.derived}>
          This replaces the current title, description, {count(current.taskOrder.length, 'task')}{' '}
          and {count(current.milestones.length, 'milestone')}.
          <span className={styles.hint}>
            The file contains “{project.name}” with {count(project.taskOrder.length, 'task')} and{' '}
            {count(project.milestones.length, 'milestone')}.
          </span>
          <span className={styles.hint}>You can undo this with {isMac ? '⌘Z' : 'Ctrl+Z'}.</span>
        </p>
      </div>
      <DialogActions>
        <Button data-autofocus onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            dispatch(importProject(project));
            onClose();
          }}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type ImportErrorDialogProps = {
  fileName: string;
  message: string;
  onClose: () => void;
};

export function ImportErrorDialog({ fileName, message, onClose }: ImportErrorDialogProps) {
  return (
    <Dialog title={`Couldn’t import “${fileName}”`} onClose={onClose}>
      <p className={styles.derived}>
        {message}
        <span className={styles.hint}>Nothing was changed.</span>
      </p>
      <DialogActions>
        <Button data-autofocus variant="primary" onClick={onClose}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
