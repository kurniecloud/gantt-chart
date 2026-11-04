# Spec: End Date needs a Start Date

Status: done.

## Decisions (agreed with the product owner, 2026-11-04)

| Topic                   | Decision                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Rule                    | In the task dialog, **End Date is disabled until its Start Date is set**.                                                              |
| Boxes                   | **Planned and Actual**: each End Date waits for its own Start Date.                                                                    |
| Clearing the start      | **Clears the End Date too** (and disables it again). Cancel in the dialog brings both back.                                            |
| Existing end-only tasks | **No special handling**: there are none in use. They still import and draw as before; in the dialog their End Date is simply disabled. |
| Hint                    | Default (not asked): "Pick a start date first" under a disabled End Date — sentence case, as hints are sentences.                      |
| After picking a start   | Default (not asked): End Date becomes available; its calendar doesn't open by itself and still greys out days before the start.        |

_Supersedes in part_ the 2026-10-31 "Partial dates" decision
([task-list-and-timeline](task-list-and-timeline.md)): an end date without a start can no longer be
entered. Start only still gives a one-day bar; the timeline still draws end-only data (e.g. from
an old file) as a one-day bar.

## Behaviour

- New task: both End Date fields show "No Date", greyed out (not clickable, no Clear button), with
  the hint linked to the field for screen readers (`aria-describedby`).
- Picking a Start Date enables that box's End Date at once.
- Clearing a Start Date empties and disables that box's End Date; an open End Date calendar
  closes.
- Actual dates still fill empty planned ones: an actual start fills an empty planned start (which
  enables the planned End Date). An actual end fills an empty planned end **only when the planned
  box has a start** — otherwise it would create the end-without-start the rule forbids.
- A parent whose planned dates come from its subtasks keeps the read-only "Calculated from
  Subtasks" box; the rule applies to its Actual box when that one is editable.
- Nothing else changes: drag/resize on the timeline, import/export, validation ("End date can't
  be before the start date"), the Milestones dialog (one date per row).

## Data model

No change (schema stays 4).

## Out of scope

Validating or converting end-only tasks on import or load; opening the End Date calendar
automatically after a start is picked.
