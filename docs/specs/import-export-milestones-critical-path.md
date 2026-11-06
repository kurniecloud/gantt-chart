# Spec: import/export, milestones, dependencies & critical path, timeline polish

Status: done (PR #4; kept current with later changes).

## Decisions (agreed with the product owner)

| Date       | Topic                | Decision                                                                                                                                                                                                |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-06 | Import / export      | Native `.gantt.json` is the **only** import and export format. Import **replaces** the open project's title, description, tasks, links and milestones (keeps its id), asks first, and is one undo step. |
| 2026-11-01 | Links                | Finish-to-start only, no lag, edited in the task dialog as **"Is Blocked By"** and **"Is Blocking"**. Links to/from a parent apply to all its subtasks; loops are refused.                              |
| 2026-11-01 | Critical path rule   | **Driving chain** back from the task(s) finishing last through the latest-finishing blockers — see [dependency-arrows](dependency-arrows.md).                                                           |
| 2026-11-01 | Critical Path button | A toggle. While on, the red lines recalculate after every change; click again to hide. The toolbar shows the number of critical subtasks ("3 Critical Tasks").                                          |
| 2026-11-01 | Milestones           | Project-level `{ name, date }` list edited in a dialog table; weekday dates; the day is light green with a ◆ marker in the date header; hovering shows the name. Today's yellow wins.                   |

## Import / export

- **Export** (header button) downloads `<project-title>.gantt.json` (the title as a slug):
  `{ "format": "gantt-chart", "schemaVersion": 4, "exportedAt": "YYYY-MM-DD", "project": {…} }`
  with title, description, tasks, hierarchy, planned and actual dates, priorities, remarks, collapse
  state, links and milestones.
- **Import** (header button) picks a `.json` file (at most 20 MB), validates it, and asks for
  confirmation in `Import “file.gantt.json”?`, saying what is replaced and what the file
  contains. One undo restores the previous project. Invalid files show `Couldn’t Import “…”`
  with the reason and change nothing. Files from older schema versions are upgraded.

## Timeline and list polish

- "Task Name" header cell: larger and centred (below the project totals). Month + year labels
  centred over their month, kept on screen while the month is partly visible.
- Each row shows the task's weekdays as `(7D)` just left of ⊕, in a darker shade of its priority
  colour. Parents count their span (from subtasks). No dates → no label. Names truncate with "…"
  before the label.
- Weekly view: four thin lines split each week column into five days.
- Today: light yellow, covering only today's day. Nothing is highlighted on weekends.

## Milestones

- The Milestones button (in the toolbar above the task list, with "5 Milestones · 3 Upcoming"
  beside it — [summaries-and-actual-toggle](summaries-and-actual-toggle.md)) opens a dialog with
  a table: Milestone Name, Milestone Date, delete. "Add Milestone" adds a row (placeholder
  "e.g. Design Sign-Off"). Save applies all changes as one undoable step, sorted by date; Cancel
  discards. Name and date are required ("Enter a name", "Pick a date"); dates are weekdays only.
- Timeline: each milestone's day is light green (column in daily view, day slice in weekly
  view) with a ◆ marker on the header's bottom edge; hovering shows
  "Milestone: Kick-off — Mon 26 Oct 2026" (names joined when several share a day).

## Links and critical path

- Task dialog: "Is Blocked By" and "Is Blocking", each with chips for the chosen tasks plus a
  dropdown ("Add a Task…"). A task can't be linked to itself, its parent chain, its subtasks, or
  anything that would make a loop (including loops through parent tasks).
- Arrows, broken-link warnings and the critical-path rule: [dependency-arrows](dependency-arrows.md).
- Critical bars get a bright red line through the middle, 20 % of the bar's thickness; the bar's
  label ends with "· Critical".

## Data model (introduced in schema v3)

- `Project.milestones: { id, name, date }[]` (migration adds `[]`).
- Links use `Project.dependencies` (`type: 'FS'`, `lagDays: 0`).

## Out of scope

Auto-scheduling (moving blocked tasks), lag/lead, other link types.
