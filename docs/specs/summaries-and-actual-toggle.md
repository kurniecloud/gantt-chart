# Spec: project summary, milestone count, show/hide actual dates

Status: done.

## Decisions (agreed with the product owner, 2026-11-01)

| Topic               | Decision                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total days          | **Project length**: weekdays from the earliest start to the latest finish (the same rule as a parent row's "(nD)"). Overlapping tasks don't add up. Planned and actual are measured alike. |
| Task count          | **Only tasks without subtasks** (the work items; parents are groups) — the same rule as the "n critical tasks" count. Rows inside collapsed parents still count.                           |
| Summary layout      | **Two lines in the "Task name" corner: totals on top** (level with the month row), **"Task name" underneath** (level with the day row, right above the task names).                        |
| Milestone summary   | **Text beside the Milestones button**, in the style of the critical-path count: "5 milestones · 3 upcoming".                                                                               |
| Actual-dates toggle | Default (not asked): a checkbox **"Actual dates"** with a blue line sample, **ticked by default**, remembered **per browser** (like Daily/Weekly), placed **just left of Critical path**.  |

## Project summary (top-left corner)

- Top line: `4 tasks · Planned 45D · Actual 30D`. Figures in the text colour, labels muted;
  "Actual" has a short blue line sample (the actual line's colour), so it doubles as a legend.
- Bottom line: "Task name" (unchanged look: larger, semi-bold, centred).
- **Tasks**: tasks without subtasks. A parent with no subtasks yet is a work item and counts.
- **Planned**: weekdays from the earliest planned start to the latest planned finish over all
  dated tasks (parents span their subtasks, as on the timeline). "—" when nothing is dated.
- **Actual**: the same over actual dates; a task started but not finished runs **up to today**
  (as the blue line does). "—" when no task has actual dates.
- Tooltips: "4 tasks without subtasks (2 parent tasks not counted)", "Planned: Mon 2 Nov 2026 –
  Fri 1 Jan 2027 (45 weekdays)", "Actual: … (in progress)".
- Covers the whole project, whatever is collapsed; updates after every change, undo included.
- Phones (panel 196 px): 11 px type, no dots or line sample, "Plan" instead of "Planned"
  (screen readers still hear "Planned"). Typical figures fit on one line; very long ones
  (e.g. 120 tasks · 450D · 300D) wrap to two tight lines instead of being cut off.

## Milestone summary (beside the Milestones button)

- `5 milestones · 3 upcoming`; `1 milestone · 1 upcoming`; `3 milestones · all passed`;
  `No milestones`.
- Upcoming = today or later; passed = before today. Tooltip names the next one:
  "Next: Beta — Thu 12 Nov 2026".
- The button and text are left-aligned in the panel toolbar (they were centred), so the button
  doesn't shift when the text changes.

## Show / hide actual dates (timeline toolbar)

- `[Daily | Weekly] [Today] [☑ ━ Actual dates] [Critical path] 3 critical tasks` — left of
  Critical path so the critical count stays beside its own button and nothing moves when the
  critical path is toggled.
- The toolbar wraps onto a second line when it doesn't fit (it already only just fitted at
  375 px before the checkbox).
- Unticked: the blue actual lines aren't drawn. Nothing else changes — actual dates stay in the
  task dialog, the file and the summary. Not part of undo (a view setting, not an edit).

## Fixed along the way

A milestone whose day had scrolled behind the task panel showed the lower half of its ◆ over
the first task row (the marker hangs below the date header, which stacked above the panel). The
task panel now stacks above the date header. Guarded by an e2e test.

## Data model

No change (schema stays 4). The toggle is stored in `localStorage`
(`gantt-chart:show-actual-dates`).

## Out of scope

Sum-of-days / effort totals, per-branch subtotals, % complete, baseline variance, a project
statistics dialog.
