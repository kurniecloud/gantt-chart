# Spec: Remarks on tasks

Status: done (PR #11).

## Decisions (agreed with the product owner)

| Date       | Topic      | Decision                                                                                                      |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| 2026-11-06 | Field      | A **"Remarks"** text box in the task dialog, **below Priority**, for every task and subtask, in add and edit. |
| 2026-11-06 | Visibility | **Dialog only**: the task list and timeline don't show remarks.                                               |
| 2026-11-06 | Format     | Optional plain text, no length limit; starts 3 lines tall and can be dragged taller; Enter adds a line.       |

## Behaviour

- Saved with Add / Save, as part of that one undo step; Cancel or Esc discards it.
- Spaces and blank lines at the start and end are trimmed; line breaks inside are kept. A box left
  empty stores nothing, and emptying it removes the remark.
- Works the same on a parent task as on a subtask (a parent's remarks are its own, not rolled up).
- ⌘Z while typing undoes the text, as in any field.
- Saved in the browser and in the `.gantt.json` file. On import, a remark that isn't text makes
  the file invalid ("task “Name” has invalid remarks"), like any other damaged field.

## Data model

No change: uses the existing optional `Task.notes` (plain text), which had no UI until now. The
schema stays at 4 and existing files are unaffected.

## Out of scope

Showing remarks on the row or timeline, rich text or links, searching remarks.
