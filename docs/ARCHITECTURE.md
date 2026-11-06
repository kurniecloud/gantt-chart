# Architecture

## Overview

```
┌───────────────────────── React UI ─────────────────────────┐
│ Header + toolbars │ Task list (virtualized) │ Timeline     │
│                   │                         │ (DOM + SVG)  │
└────────────┬───────────────────────────────┬───────────────┘
             │ dispatch(command)             │ selectors
┌────────────▼───────────────────────────────▼───────────────┐
│ Store (Zustand): project, view state, undo/redo history     │
└────────────┬───────────────────────────────────────────────┘
             │ pure calls
┌────────────▼───────────────────────────────────────────────┐
│ Domain: spans & rollups, weekday/calendar maths, tree +     │
│         moves, links + loop checks, critical path, totals   │
│         (planned: scheduler, WBS, baselines)                │
└────────────┬───────────────────────────────────────────────┘
             │
┌────────────▼──────────────┐   ┌────────────────────────────┐
│ Persistence: IndexedDB    │   │ IO: .gantt.json (JSON)     │
└───────────────────────────┘   └────────────────────────────┘
```

Data flows one way: UI dispatches a **command** → store applies it (recording immer patches
for undo) → memoized domain functions derive spans, arrows, totals and, while it's on, the
critical path → the UI re-renders → persistence debounces a save (500 ms). When
auto-scheduling exists, the scheduler will run after each command, before the UI.

## Data model (`src/domain/types.ts`)

```ts
type ISODate = string; // 'YYYY-MM-DD', a calendar day, never an instant

type Project = {
  schemaVersion: number;
  id: string;
  name: string;
  description: string; // subtitle under the title
  startDate: ISODate;
  defaultCalendarId: string;
  tasks: Record<string, Task>;
  taskOrder: string[]; // flat pre-order list; hierarchy via Task.parentId
  dependencies: Record<string, Dependency>;
  calendars: Record<string, Calendar>;
  resources: Record<string, Resource>;
  assignments: Record<string, Assignment>;
  baselines: Baseline[];
  customFields: CustomFieldDef[];
  milestones: { id: string; name: string; date: ISODate }[]; // highlighted days on the timeline
};

type Task = {
  id: string;
  parentId: string | null;
  name: string;
  mode: 'auto' | 'manual'; // 'manual' until the scheduler exists: dates are set by the user
  start?: ISODate; // planned; optional, inclusive; start only = 1-day bar
  finish?: ISODate; // planned; optional, inclusive; the dialog requires a start first
  actualStart?: ISODate; // what really happened; drawn as a blue line under the bar
  actualFinish?: ISODate; // missing while in progress (line runs to today)
  priority?: 'urgent' | 'high' | 'normal' | 'low'; // bar colour
  percentComplete: number; // 0–100
  constraint?: { type: ConstraintType; date?: ISODate };
  deadline?: ISODate;
  calendarId?: string;
  collapsed?: boolean;
  color?: string;
  notes?: string; // plain text, shown as "Remarks" in the task dialog
  custom?: Record<string, unknown>;
};

type Dependency = {
  id: string;
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number; // negative = lead
};
```

Derived values (the dates a parent spans — `effectiveSpans()` in `src/domain/taskDates.ts` —
weekday counts, project totals in `src/domain/summary.ts`, arrows, critical flags) are
**computed, not stored**, and memoized in the components that use them. Hierarchy helpers (visible rows, descendants, insert positions) live
in `src/domain/tree.ts`; timeline coordinates (weekday index, week starts) in
`src/domain/workweek.ts`; dependency rules (allowed predecessors, loop checks through parent
tasks, both link directions) in `src/domain/dependencies.ts`; the critical path (driving chain
back from the last task over the user's dates and finish-to-start links) in
`src/domain/criticalPath.ts`; arrow routing in `src/features/timeline/arrows.ts`.

UI-only state that must never be saved or undone lives in `src/store/uiStore.ts` (which dialog
is open) and `src/store/viewStore.ts` (Daily/Weekly, Actual Dates and Critical Path toggles,
recalculating). Whether the user is using the keyboard (for focus rings) is tracked by
`src/utils/inputModality.ts`. Expand/collapse is saved with the project (`Task.collapsed`) but
applied with `setCollapsed()`, outside undo history.

## Scheduler (planned — not built yet)

Today every task is manually dated (`mode: 'manual'`), links are finish-to-start with no lag,
nothing moves automatically (a broken link just turns amber), and the critical path is the
agreed **driving chain** (`src/domain/criticalPath.ts`). The auto-scheduler is planned as:

- Builds a DAG of tasks + dependencies; rejects edges that would create a cycle.
- Forward pass (early start/finish) honouring dependency type, lag, constraints and calendars.
- Backward pass (late start/finish) from the project finish → total slack, free slack (shown
  as figures; the critical path stays the driving chain unless the owner decides otherwise).
- Summary tasks span their children; dependencies on summaries apply to all descendants.
- Incremental: after a command only the downstream subgraph of changed tasks is recomputed.

Details and edge cases: `.claude/skills/scheduling-engine/SKILL.md`.

## Timeline rendering

- The task list and the timeline share **one scroll container**: the list is pinned left and
  the date header pinned top with CSS `position: sticky` (`features/workspace/Workspace.tsx`).
- Rows are virtualized once (`@tanstack/react-virtual`) and the same visible rows feed both
  sides; date columns are virtualized horizontally.
- The x axis is weekdays only. `features/timeline/scale.ts` is a pure scale for the daily
  (48 px/day) and weekly (144 px/week) views, ~10 years either side of today.
- Bars are DOM elements coloured by priority; parents are brackets spanning their subtasks.
  Link arrows are one SVG under the bars; actual dates are a blue line under each bar; the
  critical path is a red stripe through the bar.
- Drags (rows and bars) use window pointer listeners, show a live preview and dispatch one
  command on pointer-up (`moveTask`, `shiftTaskDates`).

Details: `.claude/skills/gantt-rendering/SKILL.md`.

## Persistence

- IndexedDB database `gantt-chart`, stores `projects` (by id) and `meta` (last opened project).
- The Daily/Weekly choice and Actual Dates on/off are per-browser preferences in
  `localStorage` (`store/viewStore.ts`), not part of the project.
- Autosave debounced 500 ms after each command; save on `visibilitychange` too.
- On load, run migrations from the stored `schemaVersion` to the current one.

## Deployment

Static build in `dist/`, published by `.github/workflows/deploy.yml` on push to `main`.
See `.claude/skills/deploy-github-pages/SKILL.md`.
