# Spec: project header, nested task list and timeline

Status: PR 1 (header, task list, dialogs) done · PR 2 (timeline) not started.

## Problem

The first usable version of the app: a project with a title and description, a nested list of
tasks on the left, and a weekday-only timeline on the right that shows each task as a bar.

## Decisions (agreed with the product owner, 2026-10-31)

| Topic             | Decision                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parent task dates | A task with subtasks spans them: earliest descendant start → latest descendant finish, recursively. Its own dates apply only while no descendant has dates; the dialog shows them read-only ("Calculated from subtasks"). |
| Partial dates     | Start and end are each optional. Start only → 1-day bar on the start. End only → 1-day bar on the end. Neither → no bar.                                                                                                  |
| Weekends          | Saturdays and Sundays cannot be selected in the date pickers (greyed out). The end picker also disables days before the start.                                                                                            |
| Priority          | None, Urgent, High, Normal, Low. Shown as the bar colour: Urgent red, High orange, Normal blue, Low grey, none neutral slate. Also stated in the bar's tooltip and accessible label.                                      |

## Behaviour

### Header

- Project title (single line) and subtitle/description (multi-line, grows with content) at the top
  of the page, both edited in place. Enter saves; Shift+Enter adds a line in the subtitle; Esc
  reverts. A blank title reverts to the previous title. Placeholders: "Untitled project",
  "Add a description".
- Undo / Redo icon buttons at the top right (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y).

### Task list (left panel)

- Column header shows only "Task name".
- Tasks nest to any depth; each level is indented 20 px.
- Row: expand/collapse chevron (only when the task has subtasks) · task name · ⊕ add subtask ·
  ✕ delete. Clicking the row or the name opens the edit dialog; the icons do only their action.
- The last row of the list is always a blank row with a "+" button that adds a top-level task.
- A new subtask is inserted after its parent's existing subtasks; the parent expands.
- Collapse state is saved with the project but is not part of undo history.
- Keyboard: Tab reaches every button; on a task name, ↑/↓ move between rows, → expands, ← collapses
  (or moves to the parent), Enter opens the edit dialog.

### Task dialog (add / add subtask / edit)

- Titles: "Add task", "Add subtask to “Parent”", "Edit task". Buttons: Add or Save, and Cancel.
- Fields: Task name (required), Start date, End date (calendar pickers, optional, weekdays only,
  with a Clear button), Priority (radio group with colour swatches).
- Errors: "Enter a task name", "Pick a weekday", "End date can't be before the start date".
- Esc closes an open calendar first, then the dialog.

### Delete confirmation

- Title `Delete “Name”?`. Body: "All subtasks will be deleted." plus the count when the task has
  subtasks, otherwise "This task will be deleted." A note says Cmd/Ctrl+Z undoes it.
- Buttons: Delete (danger) and Cancel (focused by default). One undo restores the whole subtree.

### First launch

- A new visitor gets an empty project titled "Untitled project" (no sample data).

### Timeline (right panel) — PR 2

- View switch above the timeline: Daily (default) / Weekly. Remembered per browser.
- Weekdays only. Day column 48 px; week column 144 px (3×). In weekly view a bar still starts
  and ends on its exact day within the week (each weekday = 1/5 of the week).
- Header: month + year on the top row; "Mon 2" (daily) or "28 Sep - 2 Oct" (weekly) below.
- Scrolls about 10 years back and forward; only visible columns are rendered.
- Opens with today as the first column (the next Monday on weekends); a "Today" button returns
  there. Today's column / the current week is light green.
- Bars coloured by priority; parent bars use a thinner bracket shape; click a bar to edit; hover
  shows dates and priority.
- Task list and timeline share one scroll area so rows always line up.

## Data model changes (schema v2)

- `Project.description: string` (new).
- `Task.start?` / `Task.finish?` become optional; `Task.priority?: 'urgent' | 'high' | 'normal' | 'low'`
  (new); `Task.durationDays` removed (duration is derived from the dates).
- Migration v1 → v2 adds an empty description and drops `durationDays`.

## Acceptance criteria — PR 1

1. A fresh visit shows an empty project, "Untitled project", and one "+" row.
2. Title and description can be edited in place and survive a reload.
3. Adding a task opens the dialog; Add is refused without a name; the new task appears above the
   "+" row.
4. ⊕ on any task (at any depth) adds a subtask under it, indented one level further.
5. Weekend days are disabled in both pickers; days before the start are disabled in the end picker.
6. Clicking a row or name opens the edit dialog with the current values; Save updates the task.
7. A parent with dated subtasks shows its dates as calculated and read-only.
8. ✕ asks for confirmation, mentions that all subtasks will be deleted, and removes the subtree;
   one undo brings it all back.
9. The chevron collapses and expands subtasks; the state survives a reload.

## Out of scope (later)

JSON import/export, dragging bars, dependencies, reordering / indenting rows, milestones.
