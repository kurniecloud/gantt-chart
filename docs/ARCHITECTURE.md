# Architecture

## Overview

```
┌───────────────────────── React UI ─────────────────────────┐
│ Toolbar │ Grid (virtualized table) │ Timeline (virtual SVG) │
└────────────┬───────────────────────────────┬───────────────┘
             │ dispatch(command)             │ selectors
┌────────────▼───────────────────────────────▼───────────────┐
│ Store (Zustand): project, view state, undo/redo history     │
└────────────┬───────────────────────────────────────────────┘
             │ pure calls
┌────────────▼───────────────────────────────────────────────┐
│ Domain: scheduler (CPM), calendar math, WBS, rollups,       │
│         validation (cycles), baselines                      │
└────────────┬───────────────────────────────────────────────┘
             │
┌────────────▼──────────────┐   ┌────────────────────────────┐
│ Persistence: IndexedDB    │   │ IO: JSON / CSV / MSPDI XML │
└───────────────────────────┘   └────────────────────────────┘
```

Data flows one way: UI dispatches a **command** → store applies it → scheduler recomputes
derived dates → selectors feed the UI → persistence debounces a save (500 ms).

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
  finish?: ISODate; // planned; optional, inclusive; end only = 1-day bar
  actualStart?: ISODate; // what really happened; drawn as a blue line under the bar
  actualFinish?: ISODate; // missing while in progress (line runs to today)
  priority?: 'urgent' | 'high' | 'normal' | 'low'; // bar colour
  percentComplete: number; // 0–100
  constraint?: { type: ConstraintType; date?: ISODate };
  deadline?: ISODate;
  calendarId?: string;
  collapsed?: boolean;
  color?: string;
  notes?: string;
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
durations, WBS numbers, early/late dates, slack, critical flag) are **computed, not stored**,
and memoized by selectors. Hierarchy helpers (visible rows, descendants, insert positions) live
in `src/domain/tree.ts`; timeline coordinates (weekday index, week starts) in
`src/domain/workweek.ts`; dependency rules (allowed predecessors, loop checks through parent
tasks, both link directions) in `src/domain/dependencies.ts`; the critical path (driving chain
back from the last task over the user's dates and finish-to-start links) in
`src/domain/criticalPath.ts`; arrow routing in `src/features/timeline/arrows.ts`.

UI-only state that must never be saved or undone (which dialog is open) lives in
`src/store/uiStore.ts`. Expand/collapse is saved with the project (`Task.collapsed`) but applied
with `setCollapsed()`, outside undo history.

## Scheduler

- Builds a DAG of tasks + dependencies; rejects edges that would create a cycle.
- Forward pass (early start/finish) honouring dependency type, lag, constraints and calendars.
- Backward pass (late start/finish) from the project finish → total slack, free slack.
- Critical = total slack ≤ 0.
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
- Bars are coloured by priority; parents are brackets spanning their subtasks.
- Future drag interactions: pointer events + rAF preview, one command on pointer-up.

Details: `.claude/skills/gantt-rendering/SKILL.md`.

## Persistence

- IndexedDB database `gantt-chart`, stores `projects` (by id) and `meta` (last opened project).
- The daily/weekly choice is a per-browser preference in `localStorage` (`store/viewStore.ts`).
- Autosave debounced 500 ms after each command; save on `visibilitychange` too.
- On load, run migrations from the stored `schemaVersion` to the current one.

## Deployment

Static build in `dist/`, published by `.github/workflows/deploy.yml` on push to `main`.
See `.claude/skills/deploy-github-pages/SKILL.md`.
