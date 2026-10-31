import { useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from '../../components/Button';
import { RedoIcon, UndoIcon } from '../../components/icons';
import { renameProject, setProjectDescription } from '../../store/commands/projectCommands';
import {
  selectCanRedo,
  selectCanUndo,
  selectRedoLabel,
  selectUndoLabel,
  useProjectStore,
} from '../../store/projectStore';
import styles from './ProjectHeader.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl+';

type TitleFieldProps = {
  value: string;
  onCommit: (value: string) => void;
};

/** Keyed by the stored value, so undo/redo resets the draft by remounting. */
function TitleField({ value, onCommit }: TitleFieldProps) {
  const [draft, setDraft] = useState(value);

  const commit = () => {
    if (draft.trim() && draft !== value) onCommit(draft);
    else setDraft(value);
  };

  return (
    <input
      className={styles.title}
      aria-label="Project title"
      placeholder="Untitled project"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

/** Multi-line and growing with its content. Enter saves; Shift+Enter starts a new line. */
function DescriptionField({ value, onCommit }: TitleFieldProps) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  return (
    <textarea
      ref={ref}
      className={styles.description}
      aria-label="Project description"
      placeholder="Add a description"
      rows={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== value) onCommit(draft);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function ProjectHeader() {
  const name = useProjectStore((s) => s.project.name);
  const description = useProjectStore((s) => s.project.description);
  const dispatch = useProjectStore((s) => s.dispatch);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore(selectCanUndo);
  const canRedo = useProjectStore(selectCanRedo);
  const undoLabel = useProjectStore(selectUndoLabel);
  const redoLabel = useProjectStore(selectRedoLabel);

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.heading}>
          <TitleField key={name} value={name} onCommit={(v) => dispatch(renameProject(v))} />
        </h1>
        <DescriptionField
          key={description}
          value={description}
          onCommit={(v) => dispatch(setProjectDescription(v))}
        />
      </div>
      <div className={styles.actions}>
        <IconButton
          label="Undo"
          title={undoLabel ? `Undo ${undoLabel.toLowerCase()} (${mod}Z)` : 'Nothing to undo'}
          aria-keyshortcuts="Control+Z Meta+Z"
          disabled={!canUndo}
          onClick={undo}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          label="Redo"
          title={redoLabel ? `Redo ${redoLabel.toLowerCase()} (${mod}Shift+Z)` : 'Nothing to redo'}
          aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
          disabled={!canRedo}
          onClick={redo}
        >
          <RedoIcon />
        </IconButton>
      </div>
    </header>
  );
}
