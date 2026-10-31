import { useId, useMemo } from 'react';
import { CrossIcon } from '../../components/icons';
import { ancestorIds } from '../../domain/dependencies';
import type { Project } from '../../domain/types';
import styles from './TaskDialog.module.css';

type DependsOnFieldProps = {
  project: Project;
  /** Tasks that may be chosen (see `dependencyCandidates`). */
  candidateIds: string[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/** Chosen predecessors as removable chips, plus a dropdown to add another. */
export function DependsOnField({
  project,
  candidateIds,
  selectedIds,
  onChange,
}: DependsOnFieldProps) {
  const selectId = useId();
  const hintId = useId();
  const available = useMemo(
    () =>
      candidateIds
        .filter((id) => !selectedIds.includes(id))
        .map((id) => ({
          id,
          // Non-breaking spaces keep the nesting visible inside a native <select>.
          label: '   '.repeat(ancestorIds(project, id).length) + project.tasks[id]!.name,
        })),
    [project, candidateIds, selectedIds],
  );

  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        Depends on
      </label>
      {selectedIds.length > 0 && (
        <ul className={styles.chips} aria-label="Tasks it depends on">
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
                  aria-label={`Remove dependency on ${name}`}
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
        <option value="">
          {available.length > 0 ? 'Add a task it depends on…' : 'No other tasks to choose from'}
        </option>
        {available.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p id={hintId} className={styles.hint}>
        It can only start once these tasks have finished.
      </p>
    </div>
  );
}
