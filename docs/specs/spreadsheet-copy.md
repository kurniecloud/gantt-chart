# Spec: Spreadsheet copy

Status: done (PR #20).

The JSON Editor can show the project as a table and copy it, ready to paste into a spreadsheet
with nothing lost: every cell lands in its own column, Task Ids and names stay exactly as typed,
dates arrive as real dates and multi-line remarks stay in one cell.

## Decisions (agreed with the product owner)

| Date       | Topic        | Decision                                                                                                                                                                                                            |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-28 | Button       | A **"Spreadsheet"** button in the JSON Editor, **to the right of Validate**. A neutral label: UI labels, docs and code name no other products.                                                                      |
| 2026-11-28 | What it does | The text box is replaced by a **read-only table** of the data, with a **"Copy Table"** button that puts it on the clipboard ready to paste, and **"Back to JSON"** to return to the text.                           |
| 2026-11-28 | Task columns | Task Id, Task Name, Planned Start Date, Planned End Date, Actual Start Date, Actual End Date, Status, **Owner**, Is Blocked By, Is Blocking, Priority, Remarks (Owner sits where it is in the task dialog).         |
| 2026-11-28 | Task Id      | Outline numbers from 1: subtasks of 1 are 1.1, 1.2…; subtasks of 1.1 are 1.1.1, 1.1.2…, to any depth.                                                                                                               |
| 2026-11-28 | Status       | **Not Started** (default) · **In Progress** (Actual Start Date set, no Actual End Date) · **Completed** (both set).                                                                                                 |
| 2026-11-28 | Other data   | The same copy also holds the **project title and description** (first rows, above the tasks) and a **milestones table** (Milestone Name, Date) after one blank row below the tasks. Nothing in the project is lost. |
| 2026-11-28 | Parent rows  | A task with subtasks shows dates **calculated from its subtasks**: planned as the app shows; Actual Start = earliest subtask actual start; Actual End only once **every** subtask is Completed.                     |

## Behaviour

### Buttons

- JSON view: Validate · Spreadsheet on the left, Cancel · Save on the right.
- Table view: Back to JSON · Copy Table on the left, Cancel · Save on the right. Cancel and Save
  work as in the JSON view (Save saves the JSON text, including edits made before switching).
- Spreadsheet uses the **text currently in the editor**, so unsaved edits are included. If the
  text isn't valid, the editor stays as it is and shows the same red message as Validate.
- Switching keeps the JSON text, its cursor and scroll position. Focus moves to Copy Table on
  the way in and back to the text box on the way out.
- Hint in the table view: "The project as a table. Copy it, then paste it into a spreadsheet."

### Copy Table

- Copies two formats at once: a formatted table (read by spreadsheet apps, cell by cell) and
  tab-separated plain text (for anything else).
- Message after copying (green): "Copied 7 task rows and 3 milestones. Paste them into a
  spreadsheet." If the browser blocks the clipboard (red): "The browser blocked copying. Select
  the table and copy it instead." The message clears when the view changes.

### What is copied

1. The project title (bold), then the description (left out when empty), then a blank row.
2. The tasks table: a bold header row, then every task in task-list order, collapsed subtasks
   included.
3. A blank row, then the milestones table: a bold header row (Milestone Name, Date), then the
   milestones in the order the Milestones dialog keeps (date order).

### Cells

- **Text cells are marked as text**, so nothing is converted on paste: Task Id "1.10" stays 1.10
  (not 1.1), and names like "1/2", "March" or "=Total" stay as typed (no dates or formulas).
  Repeated spaces and spaces at either end are kept.
- **Dates are real dates** (sortable and filterable), shown as "2 Nov 2026"; a date that isn't set
  is an empty cell.
- **Task Name** is indented one step per level with the spreadsheet's own cell indent (the text
  itself has no added spaces); rows of tasks with subtasks are bold.
- **Planned dates**: a task's own dates as saved (a start without an end leaves the end empty); a
  task with dated subtasks shows their span (earliest start → latest end), as the app does.
- **Actual dates**: a task's own dates as saved. A task whose subtasks have actual dates shows
  the earliest actual start of its subtasks and, once every subtask is Completed, the latest
  actual end; otherwise its Actual End Date is empty.
- **Status** follows the rule above from the row's actual dates, so a parent is In Progress once
  any subtask has started and Completed when all are. An Actual End Date without an Actual
  Start Date (only possible in an older or hand-edited file) counts as Not Started.
- **Owner**: as saved; empty when there is none.
- **Is Blocked By / Is Blocking**: Task Ids in task-list order, comma-separated in one cell
  ("1.2, 2.1"). A link to or from a parent shows the parent's Task Id.
- **Priority**: Urgent, High, Normal, Low, or None, as in the task dialog.
- **Remarks**: as saved; line breaks stay inside the one cell.

### Table view on screen

- The same rows and cells as the copy, in a box as tall as the text box that scrolls both ways;
  the header rows stay in view while scrolling down.
- Parent rows bold and Task Names indented, like the task list.
- On phones the box scrolls sideways and the buttons wrap onto two lines (Back to JSON · Copy
  Table, then Cancel · Save). Every dialog's buttons now wrap when they don't fit.

## Data model

No change to the saved data.

## Out of scope

Pasting from a spreadsheet back into the app; downloading a spreadsheet file (`.gantt.json`
stays the only file format); choosing or reordering columns; the internal fields that have no
place in the app yet (percent complete, constraints, calendars, resources, baselines).
