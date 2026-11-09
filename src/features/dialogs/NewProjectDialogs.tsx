import { Button } from '../../components/Button';
import { Dialog, DialogActions } from '../../components/Dialog';
import { todayISO } from '../../domain/dates';
import { downloadProject } from '../../io/download';
import { clearProject } from '../../store/commands/projectCommands';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { isMac } from '../../utils/platform';
import styles from './TaskDialog.module.css';

type NewProjectDialogProps = {
  onClose: () => void;
};

/** First step of New: Yes exports and clears, No moves on to the confirmation. */
export function ExportBeforeNewDialog({ onClose }: NewProjectDialogProps) {
  const project = useProjectStore((s) => s.project);
  const dispatch = useProjectStore((s) => s.dispatch);
  const openDialog = useUiStore((s) => s.openDialog);

  return (
    <Dialog title="Start a New Project?" onClose={onClose}>
      <div className={styles.form}>
        <p className={styles.derived}>
          Do you want to export the current project to a .gantt.json file first?
          <span className={styles.hint}>
            Starting a new project clears its title, description, tasks and milestones.
          </span>
        </p>
      </div>
      <DialogActions>
        <Button
          variant="primary"
          onClick={() => {
            downloadProject(project);
            dispatch(clearProject(todayISO()));
            onClose();
          }}
        >
          Yes
        </Button>
        <Button onClick={() => openDialog({ kind: 'new-project-clear' })}>No</Button>
        <Button data-autofocus onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Second step of New, reached only by declining the export. */
export function ClearProjectDialog({ onClose }: NewProjectDialogProps) {
  const dispatch = useProjectStore((s) => s.dispatch);

  return (
    <Dialog title="Clear Without Exporting?" onClose={onClose}>
      <div className={styles.form}>
        <p className={styles.derived}>
          The current title, description, tasks and milestones will be cleared and not exported.
          <span className={styles.hint}>You can undo this with {isMac ? '⌘Z' : 'Ctrl+Z'}.</span>
        </p>
      </div>
      <DialogActions>
        <Button data-autofocus onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(clearProject(todayISO()));
            onClose();
          }}
        >
          Clear Project
        </Button>
      </DialogActions>
    </Dialog>
  );
}
