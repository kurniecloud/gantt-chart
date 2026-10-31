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
};

type Task = {
  id: string;
  parentId: string | null;
  name: string;
  mode: 'auto' | 'manual'; // 'manual' until the scheduler exists: dates are set by the user
  start?: ISODate; // optional, inclusive; start only = 1-day bar
  finish?: ISODate; // optional, inclusive; end only = 1-day bar
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
`src/domain/workweek.ts`.

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

- One `<svg>` per visible row band, rows virtualized with the grid so both sides share
  scroll position and row heights.
- X scale is a pure function `dateToX(date, zoom, origin)`; zoom changes swap the scale only.
- Dependency arrows are drawn in a separate overlay layer, only for visible endpoints
  (plus edges crossing the viewport).
- Drag interactions use pointer events + `requestAnimationFrame`; preview locally, commit a
  single command on pointer-up so undo restores the whole drag.

Details: `.claude/skills/gantt-rendering/SKILL.md`.

## Persistence

- IndexedDB database `gantt-chart`, stores `projects` (by id) and `meta` (last opened, prefs).
- Autosave debounced 500 ms after each command; save on `visibilitychange` too.
- On load, run migrations from the stored `schemaVersion` to the current one.

## Deployment

Static build in `dist/`, published by `.github/workflows/deploy.yml` on push to `main`.
See `.claude/skills/deploy-github-pages/SKILL.md`.
