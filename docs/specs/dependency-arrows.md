# Spec: dependency arrows, blocking links, driving-chain critical path, fixes

Status: done (PR #5; kept current with later changes).

## Decisions (agreed with the product owner)

| Date       | Topic              | Decision                                                                                                                                                                                   |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-01 | Critical path rule | **Driving chain.** Start from the task(s) finishing last; follow "is blocked by" links backwards, at each step taking the blocker(s) that finish latest. Spare days don't break the chain. |
| 2026-11-01 | Link wording       | Task dialog: **"Is Blocked By"** (tasks this one waits for) and **"Is Blocking"** (tasks waiting for this one). Both editable with the same chips + dropdown.                              |
| 2026-11-01 | Arrow colour       | Grey. **Dashed amber** when the link is broken by the dates (the blocked task starts on or before the day its blocker finishes); the arrow's tooltip says so.                              |
| 2026-11-01 | Priority colours   | Urgent light red `#fca5a5`, High orange `#fdba74`, Normal teal `#5eead4`, Low light blue `#93c5fd`, None slate; the "(7D)" text uses darker shades of the same hues.                       |

## Arrows

- One arrow per link, from the end of the blocking bar to the start of the blocked bar, with an
  arrowhead. If there's room, it goes right, down/up to the blocked row, then right into the bar;
  otherwise it steps out, drops to the row boundary next to the blocked bar, runs back past its
  start, and comes in from the left.
- A link to or from a parent task connects the parent bars (e.g. Planning → Build → Test → Launch).
- A task hidden inside a collapsed parent is represented by that parent's bar; links that end up
  inside the same row are not drawn; duplicates between the same two rows are drawn once.
- Arrows sit above the grid and highlights, below the bars. Hovering an arrow shows
  "Build → Test"; a broken link adds "Starts before the task blocking it has finished."

## Critical path (driving chain)

- Over dated leaf tasks (links to/from parents expanded to their subtasks). Undated tasks are
  passed through: a task blocked by an undated task that is itself blocked by X is driven by X.
- End tasks = those finishing on the project's last day. From each, mark the blockers with the
  latest finish (ties: all of them) and continue from those. Parents of marked tasks are marked.
- Uses planned dates only; nothing is rescheduled.
- Toolbar status beside the Critical Path button: "3 Critical Tasks" (marked subtasks), or
  "No Dated Tasks". Refresh while on: [drag-and-actuals](drag-and-actuals.md).

## Weekly gridlines

The four day lines are drawn inside each 144 px week tile (never a repeating 28.8 px tile, which
browsers round so the lines drift out of line with the week boundaries). Guarded by
`tests/e2e/gridlines.spec.ts`.

## Out of scope

Drag-to-link, editing links on the timeline, lag/lead, other link types, auto-scheduling.
