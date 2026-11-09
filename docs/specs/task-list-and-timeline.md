# Spec: project header, nested task list and timeline

Status: done (PRs #2–#3; kept current with later changes).

The core of the app: a project with a title and description, a nested list of tasks on the
left, and a weekday-only timeline on the right that shows each task as a bar. Later features
are specified separately — see [Related specs](#related-specs).

## Decisions (agreed with the product owner)

| Date       | Topic             | Decision                                                                                                                                                                                                                  |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-31 | Parent task dates | A task with subtasks spans them: earliest descendant start → latest descendant finish, recursively. Its own dates apply only while no descendant has dates; the dialog shows them read-only ("Calculated from Subtasks"). |
| 2026-11-04 | Partial dates     | Start and end are optional, but **an end date needs a start date** (End Date is disabled until a start is set — [end-date-needs-start](end-date-needs-start.md)). Start only → 1-day bar on the start. Neither → no bar.  |
| 2026-10-31 | Weekends          | Saturdays and Sundays cannot be selected in the date pickers (greyed out). The End Date picker also greys out days before the start. The timeline has no weekend columns.                                                 |
| 2026-11-01 | Priority          | None, Urgent, High, Normal, Low. Bar colours: Urgent light red, High orange, Normal teal, Low light blue, None slate (tokens in `src/styles/tokens.css`). Also stated in the bar's tooltip and accessible label.          |
| 2026-11-01 | Today             | Light yellow, covering only today's day (a fifth of the week column in weekly view). Nothing is highlighted on weekends.                                                                                                  |
| 2026-10-31 | Timeline views    | Daily (48 px/day, default) and Weekly (144 px/week, labels "28 Sep - 2 Oct"); ±10 years; opens on today (the next Monday on weekends); the choice is remembered per browser.                                              |
| 2026-10-31 | First launch      | An empty project titled "Untitled Project" (no sample data).                                                                                                                                                              |
| 2026-11-02 | UI text           | Labels in Title Case; small words (a, to, of, by, for…) lowercase unless first or last; sentences (hints, warnings, errors) in sentence case. Rule in `CLAUDE.md` → Code style.                                           |

## Behaviour

### Header

- Project title (single line) and description (multi-line, grows with content) at the top of
  the page, both edited in place. Enter saves; Shift+Enter adds a line in the description; Esc
  reverts. A blank title reverts to the previous title. Placeholders: "Untitled Project",
  "Add a Description".
- New, Import and Export buttons ([new-project](new-project.md),
  [import-export-milestones-critical-path](import-export-milestones-critical-path.md)).
- Undo / Redo icon buttons at the top right (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y), with
  tooltips naming the step, e.g. "Undo Edit Task (⌘Z)", or "Nothing to Undo".

### Task list (left panel)

- Header cell: the project totals on top, "Task Name" below
  ([summaries-and-actual-toggle](summaries-and-actual-toggle.md)).
- Tasks nest to any depth; each level is indented 20 px (12 px on phones).
- Row: ⋮⋮ grip (drag to reorder — [drag-and-actuals](drag-and-actuals.md)) · expand/collapse
  chevron (only when the task has subtasks) · task name · "(7D)" weekday count in a darker shade
  of the priority colour (parents count their span; no dates → no label) · ⊕ "Add Subtask to …"
  · ✕ "Delete …". Names truncate with "…" before the count. Clicking the row or the name opens
  the edit dialog; the icons do only their action.
- The last row is always a blank row with a "+" button ("Add Task") that adds a top-level task.
- A new subtask is inserted after its parent's existing subtasks; the parent expands.
- Collapse state is saved with the project but is not part of undo history.
- Keyboard: Tab reaches every button; on a task name, ↑/↓ move between rows, Home/End jump to
  the first/last row, → expands, ← collapses (or moves to the parent), Enter opens the edit
  dialog, Alt+Shift+arrows move the task.

### Task dialog (add / add subtask / edit)

- Titles: "Add Task", "Add Subtask to “Parent”", "Edit Task". Buttons: Add or Save, and Cancel.
- Fields: Task Name (required) · a **Planned** box and an **Actual** box, each with Start Date and
  End Date (calendar pickers, optional, weekdays only, with a Clear button; End Date disabled
  until its Start Date is set — [end-date-needs-start](end-date-needs-start.md);
  actual dates — [drag-and-actuals](drag-and-actuals.md)) · Is Blocked By / Is Blocking links
  ([dependency-arrows](dependency-arrows.md)) · Priority (radio group with colour swatches) ·
  Remarks (plain text box — [task-remarks](task-remarks.md)).
- A parent with dated subtasks shows its planned (and, when subtasks have them, actual) dates as
  read-only, "Calculated from Subtasks".
- Errors: "Enter a task name", "Enter a valid date", "Pick a weekday", "End date can't be before
  the start date".
- Esc closes an open calendar first, then the dialog.

### Delete confirmation

- Title `Delete “Name”?`. Body: "All subtasks will be deleted." plus "N subtasks will be removed
  with it." when the task has subtasks, otherwise "This task will be deleted."; then "You can
  undo this with ⌘Z." (Ctrl+Z elsewhere).
- Buttons: Delete (danger) and Cancel (focused by default). One undo restores the whole subtree.

### Timeline (right panel)

- Toolbar: Daily / Weekly switch, Today, Actual Dates and Critical Path toggles
  ([summaries-and-actual-toggle](summaries-and-actual-toggle.md),
  [dependency-arrows](dependency-arrows.md)).
- Weekdays only. In weekly view a bar still starts and ends on its exact day within the week
  (each weekday = 1/5 of the week); four thin lines split each week into days.
- Header: month + year on the top row, centred over the month and kept on screen while it's
  partly visible; "Mon 2" (daily) or "28 Sep - 2 Oct" (weekly) below. Today's cell is emphasised.
- Scrolls about 10 years back and forward; only visible rows and columns are rendered.
- Opens with today as the first column (the next Monday on weekends); "Today" returns there.
- Bars coloured by priority; parent bars use a thinner bracket shape; click a bar to edit;
  hover shows e.g. "Design: Mon 2 Nov 2026 – Fri 6 Nov 2026 · High Priority".
- Task list and timeline share one scroll area so rows always line up; the task list and the
  date header stay pinned.

## Data model (introduced in schema v2)

- `Project.description: string`.
- `Task.start?` / `Task.finish?` optional; `Task.priority?: 'urgent' | 'high' | 'normal' | 'low'`;
  duration is derived from the dates (no stored `durationDays`).

## Acceptance criteria

1. A fresh visit shows an empty project, "Untitled Project", and one "+" row.
2. Title and description can be edited in place and survive a reload.
3. Adding a task opens the dialog; Add is refused without a name; the new task appears above the
   "+" row.
4. ⊕ on any task (at any depth) adds a subtask under it, indented one level further.
5. Weekend days are disabled in every picker; days before the start are disabled in the End Date
   picker; End Date is disabled until a start is set.
6. Clicking a row or name opens the edit dialog with the current values; Save updates the task.
7. A parent with dated subtasks shows its dates as calculated and read-only.
8. ✕ asks for confirmation, mentions that all subtasks will be deleted, and removes the subtree;
   one undo brings it all back.
9. The chevron collapses and expands subtasks; the state survives a reload.

## Related specs

[import-export-milestones-critical-path](import-export-milestones-critical-path.md) (files,
milestones, "(nD)" labels) · [dependency-arrows](dependency-arrows.md) (links, arrows, critical
path) · [drag-and-actuals](drag-and-actuals.md) (reorder, drag bars, planned vs actual) ·
[summaries-and-actual-toggle](summaries-and-actual-toggle.md) (totals, milestone count, Actual
Dates toggle, focus ring) · [end-date-needs-start](end-date-needs-start.md) ·
[task-remarks](task-remarks.md) · [new-project](new-project.md).
