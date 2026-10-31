import { useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { DatePicker } from '../../components/DatePicker';
import { Dialog, DialogActions } from '../../components/Dialog';
import { dependencyCandidates, predecessorIds } from '../../domain/dependencies';
import { effectiveSpans } from '../../domain/taskDates';
import {
  PRIORITIES,
  normalizeTaskInput,
  validateTaskInput,
  type TaskInputErrors,
} from '../../domain/taskInput';
import type { Priority } from '../../domain/types';
import { addTask, updateTask } from '../../store/commands/taskCommands';
import { useProjectStore } from '../../store/projectStore';
import { formatDate } from '../../utils/formatDate';
import { PRIORITY_LABELS, priorityColorVar } from '../../utils/priority';
import { DependsOnField } from './DependsOnField';
import styles from './TaskDialog.module.css';

type TaskDialogProps =
  | { mode: 'add'; parentId: string | null; onClose: () => void }
  | { mode: 'edit'; taskId: string; onClose: () => void };

export function TaskDialog(props: TaskDialogProps) {
  const project = useProjectStore((s) => s.project);
  const dispatch = useProjectStore((s) => s.dispatch);
  const task = props.mode === 'edit' ? project.tasks[props.taskId] : undefined;
  const parent = props.mode === 'add' && props.parentId ? project.tasks[props.parentId] : undefined;

  // A task whose subtasks have dates spans them; its own dates are shown read-only.
  const editTaskId = props.mode === 'edit' ? props.taskId : null;
  const derivedSpan = useMemo(() => {
    const span = editTaskId ? effectiveSpans(project).get(editTaskId) : undefined;
    return span?.fromSubtasks ? span : undefined;
  }, [project, editTaskId]);

  const [name, setName] = useState(task?.name ?? '');
  const [start, setStart] = useState(task?.start);
  const [finish, setFinish] = useState(task?.finish);
  const [priority, setPriority] = useState<Priority | undefined>(task?.priority);
  const [dependsOn, setDependsOn] = useState<string[]>(() =>
    editTaskId ? predecessorIds(project, editTaskId) : [],
  );
  const parentId = props.mode === 'add' ? props.parentId : (task?.parentId ?? null);
  const candidateIds = useMemo(
    () => dependencyCandidates(project, editTaskId, parentId),
    [project, editTaskId, parentId],
  );
  const [openPicker, setOpenPicker] = useState<'start' | 'finish' | null>(null);
  const [errors, setErrors] = useState<TaskInputErrors>({});
  const nameId = useId();
  const nameErrorId = useId();

  const title =
    props.mode === 'edit' ? 'Edit task' : parent ? `Add subtask to “${parent.name}”` : 'Add task';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = { name, start, finish, priority };
    const found = validateTaskInput(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const fields = normalizeTaskInput(input);
    if (props.mode === 'edit') dispatch(updateTask(props.taskId, fields, dependsOn));
    else dispatch(addTask(fields, props.parentId, undefined, dependsOn));
    props.onClose();
  };

  return (
    <Dialog
      title={title}
      onClose={props.onClose}
      onEscape={() => (openPicker ? setOpenPicker(null) : props.onClose())}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor={nameId} className={styles.label}>
            Task name
          </label>
          <input
            id={nameId}
            className={styles.input}
            value={name}
            data-autofocus
            autoComplete="off"
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? nameErrorId : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && (
            <p id={nameErrorId} className={styles.error}>
              {errors.name}
            </p>
          )}
        </div>

        {derivedSpan ? (
          <div className={styles.field}>
            <span className={styles.label}>Dates</span>
            <p className={styles.derived}>
              {formatDate(derivedSpan.start)} – {formatDate(derivedSpan.finish)}
              <span className={styles.hint}>Calculated from subtasks</span>
            </p>
          </div>
        ) : (
          <div className={styles.dates}>
            <DatePicker
              label="Start date"
              value={start}
              error={errors.start}
              open={openPicker === 'start'}
              onOpenChange={(open) => setOpenPicker(open ? 'start' : null)}
              onChange={setStart}
            />
            <DatePicker
              label="End date"
              value={finish}
              minDate={start}
              error={errors.finish}
              open={openPicker === 'finish'}
              onOpenChange={(open) => setOpenPicker(open ? 'finish' : null)}
              onChange={setFinish}
            />
          </div>
        )}

        <DependsOnField
          project={project}
          candidateIds={candidateIds}
          selectedIds={dependsOn}
          onChange={setDependsOn}
        />

        <fieldset className={styles.priority}>
          <legend className={styles.label}>Priority</legend>
          <div className={styles.priorityOptions}>
            {[undefined, ...PRIORITIES].map((value) => (
              <label key={value ?? 'none'} className={styles.priorityOption}>
                <input
                  type="radio"
                  name="priority"
                  checked={priority === value}
                  onChange={() => setPriority(value)}
                />
                <span
                  className={styles.swatch}
                  style={{ background: priorityColorVar(value) }}
                  aria-hidden="true"
                />
                {value ? PRIORITY_LABELS[value] : 'None'}
              </label>
            ))}
          </div>
        </fieldset>

        <DialogActions>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {props.mode === 'edit' ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
