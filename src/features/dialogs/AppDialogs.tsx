import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { ConfirmImportDialog, ImportErrorDialog } from './ImportDialogs';
import { MilestonesDialog } from './MilestonesDialog';
import { TaskDialog } from './TaskDialog';

/** Renders whichever dialog the UI store says is open. */
export function AppDialogs() {
  const dialog = useUiStore((s) => s.dialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const tasks = useProjectStore((s) => s.project.tasks);

  if (!dialog) return null;

  switch (dialog.kind) {
    case 'add-task':
    case 'edit-task':
    case 'delete-task': {
      // The task may have vanished (e.g. undo removed it) — don't show a dialog for nothing.
      const taskId = dialog.kind === 'add-task' ? dialog.parentId : dialog.taskId;
      if (taskId && !tasks[taskId]) return null;
      if (dialog.kind === 'add-task') {
        return <TaskDialog key="add" mode="add" parentId={dialog.parentId} onClose={closeDialog} />;
      }
      if (dialog.kind === 'edit-task') {
        return (
          <TaskDialog
            key={dialog.taskId}
            mode="edit"
            taskId={dialog.taskId}
            onClose={closeDialog}
          />
        );
      }
      return <DeleteTaskDialog taskId={dialog.taskId} onClose={closeDialog} />;
    }
    case 'milestones':
      return <MilestonesDialog onClose={closeDialog} />;
    case 'import-confirm':
      return (
        <ConfirmImportDialog
          fileName={dialog.fileName}
          project={dialog.project}
          onClose={closeDialog}
        />
      );
    case 'import-error':
      return (
        <ImportErrorDialog
          fileName={dialog.fileName}
          message={dialog.message}
          onClose={closeDialog}
        />
      );
  }
}
