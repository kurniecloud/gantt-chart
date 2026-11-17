# Spec: Task owner

Status: done (PR #15).

## Decisions (agreed with the product owner)

| Date       | Topic    | Decision                                                                                                                                                               |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-17 | Field    | An **"Owner"** text box in the task dialog, **directly above "Is Blocked By"**, for every task and subtask, in add and edit.                                           |
| 2026-11-17 | Shown in | **The dialog and the bar's tooltip** (and the bar's screen-reader label): "Design: Mon 2 Nov 2026 – Fri 6 Nov 2026 · High Priority · Owner: Ana". Not on the task row. |
| 2026-11-17 | Input    | **Free text with suggestions**: any name can be typed, and the box suggests the names already used on tasks in this project.                                           |
| 2026-11-17 | How many | **One owner** per task: a single text value (two people can be typed as "Ana & Ben").                                                                                  |

## Behaviour

- Optional, one line, no placeholder. Spaces at either end are trimmed; emptying the box removes the
  owner.
- Suggestions: every owner already named in the project, once each, in alphabetical order. They
  appear as the user types (or from the box's drop-down arrow) and filter as the text narrows.
- A parent's owner is its own: it is not copied to or from its subtasks, and a subtask without an
  owner shows none.
- Saved with Add / Save, as part of that one undo step; Cancel or Esc discards it.
- Tooltip: "· Owner: Ana" comes after the priority and before "· Critical"; a task without an
  owner has no owner part.
- Saved in the browser, in the `.gantt.json` file and in the JSON Editor as `"owner"`. On import,
  an owner that isn't text makes the file invalid ("task “Name” has an invalid owner").

## Data model (introduced in schema v5)

`Task.owner?: string`. Schema **4 → 5**; the migration adds nothing (the field is optional), so
existing projects and older files open unchanged. A file saved from schema 5 can't be opened by an
app still on schema 4 — only the current live app exists, so this has no effect in practice.

## Out of scope

Showing owners on the task row, several owners per task, a shared people list (resources,
workload — roadmap Phase 3, which should decide how owners relate to resources), filtering or
grouping by owner.
