import type { Priority } from '../domain/types';

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

/** CSS custom property holding the bar colour for a priority (or for no priority). */
export function priorityColorVar(priority: Priority | undefined): string {
  return `var(--color-priority-${priority ?? 'none'})`;
}

/** CSS custom property holding a readable text colour in the priority's hue. */
export function priorityTextColorVar(priority: Priority | undefined): string {
  return `var(--color-priority-${priority ?? 'none'}-text)`;
}
