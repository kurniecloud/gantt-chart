import { useEffect, useState, type FormEvent } from 'react';
import { Button, IconButton } from '../../components/Button';
import { DatePicker } from '../../components/DatePicker';
import { Dialog, DialogActions } from '../../components/Dialog';
import { CrossIcon, PlusIcon } from '../../components/icons';
import { isISODate } from '../../domain/dates';
import { newId } from '../../domain/ids';
import type { ISODate, Milestone } from '../../domain/types';
import { isWeekend } from '../../domain/workweek';
import { setMilestones } from '../../store/commands/milestoneCommands';
import { useProjectStore } from '../../store/projectStore';
import styles from './MilestonesDialog.module.css';

type DraftRow = { id: string; name: string; date: ISODate | undefined };
type RowErrors = { name?: string; date?: string };

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

/** Edit all milestones in a table; Save applies them as one undoable change. */
export function MilestonesDialog({ onClose }: { onClose: () => void }) {
  const milestones = useProjectStore((s) => s.project.milestones);
  const dispatch = useProjectStore((s) => s.dispatch);
  const [rows, setRows] = useState<DraftRow[]>(() => milestones.map((m) => ({ ...m })));
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [focusRow, setFocusRow] = useState<string | null>(null);

  useEffect(() => {
    if (focusRow)
      document.querySelector<HTMLElement>(`[data-milestone-name="${focusRow}"]`)?.focus();
  }, [focusRow]);

  const update = (id: string, patch: Partial<DraftRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

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
    const unchanged = JSON.stringify(next) === JSON.stringify(milestones);
    if (!unchanged) dispatch(setMilestones(next));
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
              <th scope="col">Milestone name</th>
              <th scope="col">Milestone date</th>
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
              return (
                <tr key={row.id}>
                  <td className={styles.nameCell}>
                    <input
                      className={styles.input}
                      value={row.name}
                      placeholder="e.g. Design sign-off"
                      aria-label={`Milestone name, row ${index + 1}`}
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
                      onChange={(date) => update(row.id, { date })}
                    />
                  </td>
                  <td className={styles.actionCell}>
                    <IconButton
                      label={`Delete milestone ${rowLabel}`}
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
        <Button className={styles.add} data-autofocus onClick={addRow}>
          <PlusIcon />
          Add milestone
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
