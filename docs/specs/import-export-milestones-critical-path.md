# Spec: import/export, milestones, dependencies & critical path, timeline polish

Status: done. The critical-path rule and the link wording were later changed — see
[dependency-arrows.md](dependency-arrows.md) (driving chain; "Is blocked by" / "Is blocking").

## Decisions (agreed with the product owner, 2026-11-01)

| Topic                | Decision                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical path basis  | New "Depends on" field in the task dialog (finish-to-start). Critical = zero (or negative) total slack, calculated from dependencies and the tasks' dates. |
| Critical path button | A toggle. While on, red lines recalculate whenever tasks change; click again to hide.                                                                      |
| Milestone names      | A ◆ marker in the date header on the milestone's day; hovering it (or the green column) shows the name.                                                    |

## Import / export

- **Export** (header button) downloads `<project-title>.gantt.json`:
  `{ "format": "gantt-chart", "schemaVersion": 3, "exportedAt": "YYYY-MM-DD", "project": {…} }`
  with title, description, tasks, hierarchy, dates, priorities, collapse state, dependencies
  and milestones.
- **Import** (header button) picks a `.json` file, validates it, and asks for confirmation:
  it replaces the title, description, all tasks, dependencies and milestones. One undo restores
  the previous project. Invalid files show an error and change nothing. Files from older schema
  versions are upgraded.

## Timeline and list polish

- "Task name" header: larger, centred in its box. Month + year labels centred over their month
  (kept on screen while the month is partly visible).
- Each row shows the task's weekdays as `(7D)` just left of ⊕, in a darker shade of its priority
  colour. Parents count their span (from subtasks). No dates → no label. Names truncate with "…"
  before the label.
- Weekly view: four thin lines split each week column into five days.
- Today: light yellow, covering only today's day (a fifth of the week column in weekly view).
  Nothing is highlighted on weekends.
- Priority bar colours are lighter.

## Milestones

- "Milestones" button above the "Task name" label opens a dialog with a table: Milestone name,
  Milestone date, delete. "Add milestone" adds a row. Save applies all changes as one undoable
  step; Cancel discards. Name and date are required; dates are weekdays only.
- Timeline: each milestone's day is light green (column in daily view, day slice in weekly
  view) with a ◆ marker in the header; the name shows on hover. Today's yellow wins if both.

## Dependencies and critical path

- Task dialog: "Depends on" — chips for chosen tasks plus a dropdown to add one. A task can't
  depend on itself, its parent chain, its subtasks, or anything that would make a loop
  (including loops through parent tasks).
- A dependency on (or of) a parent applies to all of its subtasks.
- Critical path (toolbar toggle): over tasks with dates, project finish = latest finish. Backward
  pass in weekdays: late finish = min(project finish, each successor's late start − 1 weekday);
  total slack = late finish − finish. Critical ⇔ slack ≤ 0. A parent is critical if any subtask
  is. Undated tasks are ignored. With no dependencies at all, only tasks finishing on the last day
  are critical.
- Critical bars get a bright red line through the middle, 20% of the bar's thickness. The toolbar
  shows how many tasks are critical.

## Data model (schema v3)

- `Project.milestones: { id, name, date }[]` (new; migration adds `[]`).
- Dependencies use the existing `Project.dependencies` (`type: 'FS'`, `lagDays: 0`).

## Out of scope

Dependency arrows on the timeline, auto-scheduling (moving successors), lag/lead, other
dependency types, MS Project XML / CSV import.
