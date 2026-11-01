# Spec: project summary, milestone count, show/hide actual dates

Status: done.

## Decisions (agreed with the product owner, 2026-11-01; toggle style, count and text case 2026-11-02)

| Topic               | Decision                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total days          | **Project length**: weekdays from the earliest start to the latest finish (the same rule as a parent row's "(nD)"). Overlapping tasks don't add up. Planned and actual are measured alike.                                                                         |
| Task count          | **Top-level (main) tasks**, with or without subtasks; hover shows "5 main tasks, 10 edge tasks (without subtasks)" (2026-11-02). ~~Only tasks without subtasks~~ (first build, superseded). Rows inside collapsed parents still count.                             |
| Summary layout      | **Two lines in the "Task name" corner: totals on top** (level with the month row), **"Task name" underneath** (level with the day row, right above the task names).                                                                                                |
| Milestone summary   | **Text beside the Milestones button**, in the style of the critical-path count: "5 milestones · 3 upcoming".                                                                                                                                                       |
| Actual-dates toggle | ~~A checkbox "Actual dates"~~ (first build, superseded 2026-11-02). **A toggle button like Critical path** (icon + "Actual dates", `aria-pressed`), **just left of Critical path**, **on by default**, remembered **per browser** (like Daily/Weekly).             |
| Text case           | (2026-11-02) **Title Case for every label** app-wide; small words lowercase unless first/last; sentences unchanged. So the strings below read "5 Tasks · Planned 45D", "5 Milestones · 3 Upcoming", "No Milestones", "Actual Dates", "Critical Path", "Task Name". |

## Project summary (top-left corner)

- Top line: `5 tasks · Planned 45D · Actual 30D`. Figures in the text colour, labels muted;
  "Actual" has a short blue line sample (the actual line's colour), so it doubles as a legend.
- Bottom line: "Task name" (unchanged look: larger, semi-bold, centred).
- **Tasks**: top-level (main) tasks, with or without subtasks. Hover: "5 main tasks, 10 edge
  tasks (without subtasks)" — edge tasks are tasks without subtasks at any depth, so a top-level
  task without subtasks is both.
- **Planned**: weekdays from the earliest planned start to the latest planned finish over all
  dated tasks (parents span their subtasks, as on the timeline). "—" when nothing is dated.
- **Actual**: the same over actual dates; a task started but not finished runs **up to today**
  (as the blue line does). "—" when no task has actual dates.
- Tooltips: "5 main tasks, 10 edge tasks (without subtasks)", "Planned: Mon 2 Nov 2026 –
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

- `[Daily | Weekly] [Today] [▭ Actual dates] [Critical path] 3 critical tasks` — left of
  Critical path so the critical count stays beside its own button and nothing moves when the
  critical path is toggled.
- Same kind of control as Critical path, for a consistent toolbar: a button with an icon (a bar
  with the blue actual line under it, which doubles as a legend) and `aria-pressed`. On: blue
  border and light blue fill, blue text. Off: a plain button.
- The toolbar wraps onto a second line when it doesn't fit (it already only just fitted at
  375 px before this button).
- Off: the blue actual lines aren't drawn. Nothing else changes — actual dates stay in the
  task dialog, the file and the summary. Not part of undo (a view setting, not an edit).

## Fixed along the way

**Focus ring after a click (owner's screenshot, 2026-11-02).** Clicking "Actual dates" off and
then pressing a key — even just Shift or ⌘, as in the ⌘⇧4 screenshot shortcut, or ⌘Z — made
Chrome draw the keyboard focus ring (`:focus-visible`, the same blue as the "on" border) round
the clicked button, so an off toggle looked half on. Every button did this. Now modifier keys and
shortcuts don't count as keyboard use (`utils/inputModality.ts` sets `data-input` on `<html>`;
`global.css` hides the ring while it's `pointer`); Tab, arrows, Space and Enter still show it.
Covers the Daily/Weekly control and the task dialog's priority options too. E2E-guarded.

**Milestone ◆ over the task panel.**
A milestone whose day had scrolled behind the task panel showed the lower half of its ◆ over
the first task row (the marker hangs below the date header, which stacked above the panel). The
task panel now stacks above the date header. Guarded by an e2e test.

## Data model

No change (schema stays 4). The toggle is stored in `localStorage`
(`gantt-chart:show-actual-dates`).

## Out of scope

Sum-of-days / effort totals, per-branch subtotals, % complete, baseline variance, a project
statistics dialog.
