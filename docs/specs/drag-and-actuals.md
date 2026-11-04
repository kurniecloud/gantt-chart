# Spec: reorder tasks, drag bars, planned vs actual, critical-path refresh

Status: done (PR #6; kept current with later changes).

## Decisions (agreed with the product owner)

| Date       | Topic                       | Decision                                                                                                                                                                                |
| ---------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-01 | Moves that clash with links | **Blocked.** A drop that would make a task linked to its own parent chain, or create a loop through parent links, shows as not allowed with the reason.                                 |
| 2026-11-01 | Parent bars                 | **Not draggable** (their dates come from subtasks). Tasks without subtasks can be moved and resized.                                                                                    |
| 2026-11-01 | In-progress actuals         | Actual start without an actual end: the blue line runs **up to today** (one day if the start is after today).                                                                           |
| 2026-11-04 | Actual fills planned        | An actual start fills an **empty** planned start; an actual end fills an **empty** planned end only when the planned box has a start ([end-date-needs-start](end-date-needs-start.md)). |
| 2026-11-01 | Recalculation indicator     | Input is **always blocked** while the critical path recalculates; the visible "Recalculating Critical Path…" overlay appears only if it takes longer than 0.2 s.                        |

## Reorder tasks (task list)

- Each row has a ⋮⋮ grip ("Drag to Move"). Drag it onto another row: top quarter → **above** it,
  bottom quarter → **below** it (below an expanded parent → its **first** subtask), middle → its
  **last subtask**. Dropping on the "+" row moves the task to the end of the list. Subtasks
  always move with it.
- Not allowed: anywhere inside the task's own subtree (that includes being level with its own
  children), and moves that clash with links (above). The indicator turns red and explains.
- Keyboard on a task name: Alt+Shift+↑/↓ move among siblings, Alt+Shift+→ become the last subtask
  of the row above, Alt+Shift+← move out one level (just after the parent).
- Esc cancels a drag; near the top/bottom edge the list scrolls. One undo per move; the new parent
  expands.

## Drag bars (timeline)

- Drag a bar's body to move it; drag its left/right edge to change the start/end. Snaps to whole
  weekdays; a label shows the new dates while dragging; Esc cancels; a click without movement
  still opens the edit dialog. Changes **planned** dates only. One undo per drag.
- Resizing never goes below one day. Linked tasks aren't moved; broken links turn amber.

## Planned vs actual

- Task dialog: a **Planned** box and an **Actual** box, each with Start Date and End Date.
  Weekday-only pickers; each End Date is disabled until its box has a Start Date and can't be
  before it; clearing a Start Date clears its End Date ([end-date-needs-start](end-date-needs-start.md)).
- Actual dates fill empty planned ones, visible immediately in the dialog (see Decisions).
- Parents: actual dates span their subtasks' actual dates when any subtask has them (read-only,
  "Calculated from Subtasks"), like planned dates.
- Timeline: a bright blue line, 20 % of the bar's height, just under the bar from actual start to
  actual end (or today while in progress). Tooltip "Actual: … (In Progress)". The Actual Dates
  toolbar toggle shows or hides the lines ([summaries-and-actual-toggle](summaries-and-actual-toggle.md)).
- Actual dates are saved, exported and imported. "(nD)" and the critical path use planned dates.

## Critical-path refresh

- While the toggle is on, every change (move, date edit, drag, import, undo) recalculates it.
  Clicks and keys are blocked until it's done; the overlay shows only if it's slow.

## Data model (introduced in schema v4)

- `Task.actualStart?`, `Task.actualFinish?` (ISO dates). Migration 3 → 4 adds nothing (optional).

## Out of scope

Auto-scheduling linked tasks, multi-select drag, dragging between projects, horizontal
auto-scroll while dragging bars.
