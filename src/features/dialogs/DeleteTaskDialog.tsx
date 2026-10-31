import { Button } from '../../components/Button';
import { Dialog, DialogActions } from '../../components/Dialog';
import { descendantIds } from '../../domain/tree';
import { deleteTask } from '../../store/commands/taskCommands';
import { useProjectStore } from '../../store/projectStore';
import styles from './TaskDialog.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

type DeleteTaskDialogProps = {
  taskId: string;
  onClose: () => void;
};

export function DeleteTaskDialog({ taskId, onClose }: DeleteTaskDialogProps) {
  const project = useProjectStore((s) => s.project);
  const dispatch = useProjectStore((s) => s.dispatch);
  const task = project.tasks[taskId];
  const subtaskCount = descendantIds(project, taskId).length;
  if (!task) return null;

  return (
    <Dialog title={`Delete “${task.name}”?`} onClose={onClose}>
      <div className={styles.form}>
        <p className={styles.derived}>
          {subtaskCount > 0 ? 'All subtasks will be deleted.' : 'This task will be deleted.'}
          {subtaskCount > 0 && (
            <span className={styles.hint}>
              {subtaskCount === 1 ? '1 subtask' : `${subtaskCount} subtasks`} will be removed with
              it.
            </span>
          )}
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
            dispatch(deleteTask(taskId));
            onClose();
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
