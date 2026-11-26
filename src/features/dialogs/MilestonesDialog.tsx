import { useEffect, useLayoutEffect, useState, type FormEvent } from 'react';
import { Button, IconButton } from '../../components/Button';
import { DatePicker } from '../../components/DatePicker';
import { Dialog, DialogActions } from '../../components/Dialog';
import { CrossIcon, PlusIcon } from '../../components/icons';
import { isISODate } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { placeByDate, sameMilestones, sortByDate } from '../../domain/milestones';
import type { ISODate, Milestone } from '../../domain/types';
import { isWeekend } from '../../domain/workweek';
import { setMilestones } from '../../store/commands/milestoneCommands';
import { useProjectStore } from '../../store/projectStore';
import styles from './MilestonesDialog.module.css';

type DraftRow = { id: string; name: string; date: ISODate | undefined };
type RowErrors = { name?: string; date?: string };
/** The row that just moved to its place by date; `count` restarts the flash if it moves again. */
type MovedRow = { id: string; count: number };

function validate(rows: DraftRow[]): Record<string, RowErrors> {
  const errors: Record<string, RowErrors> = {};
  for (const row of rows) {
    const rowErrors: RowErrors = {};
    if (!row.name.trim()) rowErrors.name = 'Enter a name';
    if (!row.date || !isISODate(row.date)) rowErrors.date = 'Pick a date';
    else if (isWeekend(row.date)) rowErrors.date = 'Pick a weekday';
    if (rowErrors.name || rowErrors.date) errors[row.id] = rowErrors;
  }
  return errors;
}

/**
 * Edit all milestones in a table, kept in date order: picking or clearing a date moves the row to
 * its place (a cleared one to the bottom). Save applies everything as one undoable change.
 */
export function MilestonesDialog({ onClose }: { onClose: () => void }) {
  const milestones = useProjectStore((s) => s.project.milestones);
  const dispatch = useProjectStore((s) => s.dispatch);
  const [rows, setRows] = useState<DraftRow[]>(() => sortByDate(milestones.map((m) => ({ ...m }))));
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const [moved, setMoved] = useState<MovedRow | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (focusRow)
      document.querySelector<HTMLElement>(`[data-milestone-name="${focusRow}"]`)?.focus();
  }, [focusRow]);

  // Before paint, so the row is never seen out of view at its new place.
  useLayoutEffect(() => {
    if (moved)
      document
        .querySelector(`[data-milestone-row="${moved.id}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [moved]);

  const update = (id: string, patch: Partial<DraftRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const changeDate = (id: string, date: ISODate | undefined) => {
    const from = rows.findIndex((row) => row.id === id);
    if (rows[from]?.date === date) return;
    const next = placeByDate(
      rows.map((row) => (row.id === id ? { ...row, date } : row)),
      id,
    );
    setRows(next);
    const to = next.findIndex((row) => row.id === id);
    if (to === from) return;
    setMoved((last) => ({ id, count: (last?.count ?? 0) + 1 }));
    const name = next[to]?.name.trim() || 'Milestone';
    setAnnouncement(`${name} moved to row ${to + 1}.`);
  };

  const addRow = () => {
    const id = newId();
    setRows((current) => [...current, { id, name: '', date: undefined }]);
    setFocusRow(id);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(rows);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const next: Milestone[] = rows.map((row) => ({
      id: row.id,
      name: row.name.trim(),
      date: row.date!,
    }));
    // Opening the dialog sorts the rows; that alone isn't a change worth an undo step.
    if (!sameMilestones(next, sortByDate(milestones))) dispatch(setMilestones(next));
    onClose();
  };

  return (
    <Dialog
      title="Milestones"
      size="wide"
      onClose={onClose}
      onEscape={() => (openPicker ? setOpenPicker(null) : onClose())}
    >
      <form onSubmit={save} noValidate>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Milestone Name</th>
              <th scope="col">Milestone Date</th>
              <th scope="col">
                <span className="visually-hidden">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.empty}>
                  No milestones yet.
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const rowLabel = row.name.trim() || `row ${index + 1}`;
              const rowErrors = errors[row.id] ?? {};
              const flash = moved?.id === row.id;
              return (
                <tr
                  key={row.id}
                  data-milestone-row={row.id}
                  className={flash ? (moved.count % 2 ? styles.movedA : styles.movedB) : undefined}
                  onAnimationEnd={(event) => {
                    if (flash && event.target === event.currentTarget) setMoved(null);
                  }}
                >
                  <td className={styles.nameCell}>
                    <input
                      className={styles.input}
                      value={row.name}
                      placeholder="e.g. Design Sign-Off"
                      aria-label={`Milestone Name, Row ${index + 1}`}
                      aria-invalid={rowErrors.name ? true : undefined}
                      data-milestone-name={row.id}
                      onChange={(e) => update(row.id, { name: e.target.value })}
                    />
                    {rowErrors.name && <p className={styles.error}>{rowErrors.name}</p>}
                  </td>
                  <td className={styles.dateCell}>
                    <DatePicker
                      hideLabel
                      label={`Date for ${rowLabel}`}
                      value={row.date}
                      error={rowErrors.date}
                      open={openPicker === row.id}
                      onOpenChange={(open) => setOpenPicker(open ? row.id : null)}
                      onChange={(date) => changeDate(row.id, date)}
                    />
                  </td>
                  <td className={styles.actionCell}>
                    <IconButton
                      label={`Delete Milestone ${rowLabel}`}
                      tone="danger"
                      onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
                    >
                      <CrossIcon />
                    </IconButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p role="status" className="visually-hidden">
          {announcement}
        </p>
        <Button className={styles.add} data-autofocus onClick={addRow}>
          <PlusIcon />
          Add Milestone
        </Button>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
