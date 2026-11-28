import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
import { copyFormatted } from '../../io/clipboard';
import type { ProjectSheet } from '../../io/spreadsheet';
import { projectSheet, sheetHtml, sheetText } from '../../io/spreadsheet';
import { saveProjectJson } from '../../store/commands/projectCommands';
import { useProjectStore } from '../../store/projectStore';
import { isMac } from '../../utils/platform';
import styles from './JsonEditorDialog.module.css';
import { SpreadsheetTable } from './SpreadsheetTable';

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

/**
 * The whole project as the text Export downloads, edited in place (for when files are blocked).
 * Spreadsheet swaps the text for a table of the same data, to copy into a spreadsheet.
 */
export function JsonEditorDialog({ onClose }: JsonEditorDialogProps) {
  const dispatch = useProjectStore((s) => s.dispatch);
  const [initialText] = useState(() =>
    serializeProject(useProjectStore.getState().project, todayISO()),
  );
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<Status>(null);
  /** The table view's data; `null` while the JSON text is shown. */
  const [sheet, setSheet] = useState<ProjectSheet | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const switched = useRef(false);
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

  const showSpreadsheet = () => {
    const result = check(text);
    if (!result.ok) {
      setStatus({ valid: false, message: result.message });
      return;
    }
    switched.current = true;
    setSheet(projectSheet(result.project));
    setStatus(null);
  };

  const backToJson = () => {
    switched.current = true;
    setSheet(null);
    setStatus(null);
  };

  // The button pressed to switch views goes away with its view: move focus to where the work
  // continues (Copy Table, or the text, which kept its cursor and scroll position).
  useLayoutEffect(() => {
    if (!switched.current) return;
    switched.current = false;
    if (sheet) copyRef.current?.focus();
    else editorRef.current?.focus();
  }, [sheet]);

  const copyTable = async () => {
    if (!sheet || !tableRef.current) return;
    const copied = await copyFormatted(sheetHtml(sheet), sheetText(sheet), tableRef.current);
    setStatus(
      copied
        ? {
            valid: true,
            message: `Copied ${count(sheet.tasks.length, 'task row')} and ${count(
              sheet.milestones.length,
              'milestone',
            )}. Paste them into a spreadsheet.`,
          }
        : {
            valid: false,
            message: 'The browser blocked copying. Select the table and copy it instead.',
          },
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
        {sheet
          ? 'The project as a table. Copy it, then paste it into a spreadsheet.'
          : `The whole project, as in an exported .gantt.json file. Saving replaces the project; you can undo it with ${isMac ? '⌘Z' : 'Ctrl+Z'}.`}
      </p>
      {sheet && (
        <div
          ref={tableRef}
          role="region"
          aria-label="Spreadsheet Table"
          aria-describedby={`${hintId} ${statusId}`}
          // Scrollable, so keyboard users must be able to reach it to scroll.
          tabIndex={0}
          className={styles.sheet}
        >
          <SpreadsheetTable sheet={sheet} />
        </div>
      )}
      <textarea
        hidden={sheet !== null}
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
        {sheet ? (
          <>
            <Button key="back" onClick={backToJson}>
              Back to JSON
            </Button>
            <Button key="copy" ref={copyRef} className={styles.lastOnLeft} onClick={copyTable}>
              Copy Table
            </Button>
          </>
        ) : (
          <>
            <Button key="validate" onClick={validate}>
              Validate
            </Button>
            <Button key="spreadsheet" className={styles.lastOnLeft} onClick={showSpreadsheet}>
              Spreadsheet
            </Button>
          </>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
