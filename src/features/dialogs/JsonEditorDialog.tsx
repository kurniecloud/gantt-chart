import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog, DialogActions } from '../../components/Dialog';
import { todayISO } from '../../domain/dates';
import { mainTaskCount } from '../../domain/summary';
import type { Project } from '../../domain/types';
import {
  MAX_FILE_BYTES,
  ProjectFileError,
  parseProjectFile,
  serializeProject,
} from '../../io/projectFile';
import { saveProjectJson } from '../../store/commands/projectCommands';
import { useProjectStore } from '../../store/projectStore';
import { isMac } from '../../utils/platform';
import styles from './JsonEditorDialog.module.css';

type CheckResult = { ok: true; project: Project } | { ok: false; message: string };

/** The same checks as Import, so "valid" means Save will work. */
function check(text: string): CheckResult {
  try {
    if (text.length > MAX_FILE_BYTES) {
      throw new ProjectFileError('The text is too large (over 20 MB).');
    }
    return { ok: true, project: parseProjectFile(text) };
  } catch (error) {
    const message =
      error instanceof ProjectFileError ? error.message : 'The text could not be read.';
    return { ok: false, message };
  }
}

function count(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

type Status = { valid: boolean; message: string } | null;

type JsonEditorDialogProps = {
  onClose: () => void;
};

/** The whole project as the text Export downloads, edited in place (for when files are blocked). */
export function JsonEditorDialog({ onClose }: JsonEditorDialogProps) {
  const dispatch = useProjectStore((s) => s.dispatch);
  const [initialText] = useState(() =>
    serializeProject(useProjectStore.getState().project, todayISO()),
  );
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<Status>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const statusId = useId();

  useEffect(() => {
    // Dialog has focused the text box by now; start at the top, not wherever the caret landed.
    const editor = editorRef.current;
    if (!editor) return;
    editor.setSelectionRange(0, 0);
    editor.scrollTop = 0;
  }, []);

  const validate = () => {
    const result = check(text);
    setStatus(
      result.ok
        ? {
            valid: true,
            message: `Valid: ${count(mainTaskCount(result.project), 'task')} and ${count(
              result.project.milestones.length,
              'milestone',
            )}.`,
          }
        : { valid: false, message: result.message },
    );
  };

  const save = () => {
    if (text === initialText) {
      onClose();
      return;
    }
    const result = check(text);
    if (!result.ok) {
      setStatus({ valid: false, message: result.message });
      return;
    }
    dispatch(saveProjectJson(result.project));
    onClose();
  };

  return (
    <Dialog title="JSON Editor" size="large" onClose={onClose}>
      <p id={hintId} className={styles.hint}>
        The whole project, as in an exported .gantt.json file. Saving replaces the project; you can
        undo it with {isMac ? '⌘Z' : 'Ctrl+Z'}.
      </p>
      <textarea
        ref={editorRef}
        data-autofocus
        className={styles.editor}
        aria-label="Project JSON"
        aria-describedby={`${hintId} ${statusId}`}
        aria-invalid={status?.valid === false || undefined}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStatus(null);
        }}
      />
      <p
        id={statusId}
        role="status"
        className={[styles.status, status && (status.valid ? styles.valid : styles.invalid)]
          .filter(Boolean)
          .join(' ')}
      >
        {status?.message}
      </p>
      <DialogActions>
        <Button className={styles.validate} onClick={validate}>
          Validate
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
