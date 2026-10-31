import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { TaskDialog } from './TaskDialog';

/** Renders whichever task dialog the UI store says is open. */
export function TaskDialogs() {
  const dialog = useUiStore((s) => s.dialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const tasks = useProjectStore((s) => s.project.tasks);

  if (!dialog) return null;
  // The task may have vanished (e.g. undo removed it) — don't show a dialog for nothing.
  const taskId = dialog.kind === 'add-task' ? dialog.parentId : dialog.taskId;
  if (taskId && !tasks[taskId]) return null;

  switch (dialog.kind) {
    case 'add-task':
      return <TaskDialog key="add" mode="add" parentId={dialog.parentId} onClose={closeDialog} />;
    case 'edit-task':
      return (
        <TaskDialog key={dialog.taskId} mode="edit" taskId={dialog.taskId} onClose={closeDialog} />
      );
    case 'delete-task':
      return <DeleteTaskDialog taskId={dialog.taskId} onClose={closeDialog} />;
  }
}
