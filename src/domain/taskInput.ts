import { isISODate } from './dates';
import type { TaskFields } from './project';
import type { Priority } from './types';
import { isWeekend } from './workweek';

/** Highest first — the order priorities are offered in. */
export const PRIORITIES: readonly Priority[] = ['urgent', 'high', 'normal', 'low'];

export type TaskInputErrors = Partial<
  Record<'name' | 'start' | 'finish' | 'actualStart' | 'actualFinish', string>
>;

/** Checks what the task dialog collected. An empty result means the input can be saved. */
export function validateTaskInput(input: TaskFields): TaskInputErrors {
  const errors: TaskInputErrors = {};
  if (!input.name.trim()) errors.name = 'Enter a task name';

  for (const field of ['start', 'finish', 'actualStart', 'actualFinish'] as const) {
    const value = input[field];
    if (value === undefined) continue;
    if (!isISODate(value)) errors[field] = 'Enter a valid date';
    else if (isWeekend(value)) errors[field] = 'Pick a weekday';
  }

  for (const [start, finish] of [
    ['start', 'finish'],
    ['actualStart', 'actualFinish'],
  ] as const) {
    const from = input[start];
    const to = input[finish];
    if (!errors[start] && !errors[finish] && from && to && to < from) {
      errors[finish] = "End date can't be before the start date";
    }
  }
  return errors;
}

/** Trims the name and drops empty optional fields. Call after `validateTaskInput` passes. */
export function normalizeTaskInput(input: TaskFields): TaskFields {
  const fields: TaskFields = { name: input.name.trim() };
  if (input.start) fields.start = input.start;
  if (input.finish) fields.finish = input.finish;
  if (input.actualStart) fields.actualStart = input.actualStart;
  if (input.actualFinish) fields.actualFinish = input.actualFinish;
  if (input.priority) fields.priority = input.priority;
  return fields;
}
