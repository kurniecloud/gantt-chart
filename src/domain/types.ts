/** A calendar day in `YYYY-MM-DD` form. Never an instant — see `dates.ts`. */
export type ISODate = string;

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type ConstraintType = 'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO';

export type SchedulingMode = 'auto' | 'manual';

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export type Task = {
  id: string;
  parentId: string | null;
  name: string;
  mode: SchedulingMode;
  /**
   * The task's own dates, both optional and inclusive (a 1-day task has `start === finish`).
   * A task with dated subtasks is drawn spanning them instead — see `taskDates.ts`.
   */
  start?: ISODate;
  finish?: ISODate;
  priority?: Priority;
  /** 0–100. */
  percentComplete: number;
  constraint?: { type: ConstraintType; date?: ISODate };
  deadline?: ISODate;
  calendarId?: string;
  collapsed?: boolean;
  color?: string;
  notes?: string;
  custom?: Record<string, unknown>;
};

export type Dependency = {
  id: string;
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  /** Working days; negative = lead. */
  lagDays: number;
  /** When set, lag is a percentage of the predecessor's duration and `lagDays` is ignored. */
  lagPercent?: number;
};

export type CalendarException = {
  date: ISODate;
  working: boolean;
  name?: string;
};

export type Calendar = {
  id: string;
  name: string;
  /** Index 0 = Sunday … 6 = Saturday. */
  workingWeekdays: boolean[];
  exceptions: CalendarException[];
};

export type Resource = {
  id: string;
  name: string;
  type: 'work' | 'material';
  /** 1 = 100 %. */
  maxUnits: number;
  costPerDay?: number;
  calendarId?: string;
};

export type Assignment = {
  id: string;
  taskId: string;
  resourceId: string;
  /** 1 = 100 %. */
  units: number;
};

export type Baseline = {
  index: number;
  savedAt: ISODate;
  tasks: Record<string, { start: ISODate; finish: ISODate; durationDays: number }>;
};

export type CustomFieldDef = {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  options?: string[];
};

export type Project = {
  schemaVersion: number;
  id: string;
  name: string;
  /** Subtitle shown under the title; may be empty. */
  description: string;
  startDate: ISODate;
  defaultCalendarId: string;
  tasks: Record<string, Task>;
  /** Flat pre-order list of task ids; hierarchy comes from `Task.parentId`. */
  taskOrder: string[];
  dependencies: Record<string, Dependency>;
  calendars: Record<string, Calendar>;
  resources: Record<string, Resource>;
  assignments: Record<string, Assignment>;
  baselines: Baseline[];
  customFields: CustomFieldDef[];
};
