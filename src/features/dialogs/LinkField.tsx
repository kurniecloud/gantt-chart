import { useId, useMemo } from 'react';
import { CrossIcon } from '../../components/icons';
import { ancestorIds } from '../../domain/dependencies';
import type { Project } from '../../domain/types';
import styles from './TaskDialog.module.css';

type LinkFieldProps = {
  /** e.g. "Is blocked by". */
  label: string;
  /** One line under the field explaining what the links mean. */
  hint: string;
  project: Project;
  /** Tasks that may be chosen (see `linkCandidates`). */
  candidateIds: string[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/** Linked tasks as removable chips, plus a dropdown to add another. */
export function LinkField({
  label,
  hint,
  project,
  candidateIds,
  selectedIds,
  onChange,
}: LinkFieldProps) {
  const selectId = useId();
  const hintId = useId();
  const available = useMemo(
    () =>
      candidateIds
        .filter((id) => !selectedIds.includes(id))
        .map((id) => ({
          id,
          // Non-breaking spaces keep the nesting visible inside a native <select>.
          label:
            '\u00a0\u00a0\u00a0'.repeat(ancestorIds(project, id).length) + project.tasks[id]!.name,
        })),
    [project, candidateIds, selectedIds],
  );

  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      {selectedIds.length > 0 && (
        <ul className={styles.chips} aria-label={`${label} (chosen)`}>
          {selectedIds.map((id) => {
            const name = project.tasks[id]?.name ?? 'Deleted task';
            return (
              <li key={id} className={styles.chip}>
                <span className={styles.chipName} title={name}>
                  {name}
                </span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`Remove ${name} from “${label}”`}
                  onClick={() => onChange(selectedIds.filter((other) => other !== id))}
                >
                  <CrossIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <select
        id={selectId}
        className={styles.input}
        value=""
        disabled={available.length === 0}
        aria-describedby={hintId}
        onChange={(event) => {
          if (event.target.value) onChange([...selectedIds, event.target.value]);
        }}
      >
        <option value="">{available.length > 0 ? 'Add a task…' : 'No tasks to choose from'}</option>
        {available.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p id={hintId} className={styles.hint}>
        {hint}
      </p>
    </div>
  );
}
