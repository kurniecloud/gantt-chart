import { useState } from 'react';
import { addTask, renameProject } from '../../store/commands/projectCommands';
import {
  selectCanRedo,
  selectCanUndo,
  selectRedoLabel,
  selectUndoLabel,
  useProjectStore,
} from '../../store/projectStore';
import styles from './Toolbar.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl+';

type ProjectNameInputProps = {
  name: string;
  onRename: (name: string) => void;
};

/** Keyed by the stored name, so undo/redo of a rename resets the draft by remounting. */
function ProjectNameInput({ name, onRename }: ProjectNameInputProps) {
  const [draft, setDraft] = useState(name);

  const commit = () => {
    if (draft.trim() && draft !== name) onRename(draft);
    else setDraft(name);
  };

  return (
    <input
      className={styles.projectName}
      aria-label="Project name"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(name);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function Toolbar() {
  const projectName = useProjectStore((s) => s.project.name);
  const dispatch = useProjectStore((s) => s.dispatch);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore(selectCanUndo);
  const canRedo = useProjectStore(selectCanRedo);
  const undoLabel = useProjectStore(selectUndoLabel);
  const redoLabel = useProjectStore(selectRedoLabel);

  return (
    <header className={styles.toolbar}>
      <ProjectNameInput
        key={projectName}
        name={projectName}
        onRename={(name) => dispatch(renameProject(name))}
      />
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => dispatch(addTask())}>
          Add task
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-keyshortcuts="Control+Z Meta+Z"
          title={undoLabel ? `Undo ${undoLabel} (${mod}Z)` : 'Nothing to undo'}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
          title={redoLabel ? `Redo ${redoLabel} (${mod}Shift+Z)` : 'Nothing to redo'}
        >
          Redo
        </button>
      </div>
    </header>
  );
}
