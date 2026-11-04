# Spec: project summary, milestone count, Actual Dates toggle, focus ring

Status: done (PRs #8–#9).

## Decisions (agreed with the product owner)

| Date       | Topic               | Decision                                                                                                                                                                                   |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-01 | Total days          | **Project length**: weekdays from the earliest start to the latest finish (the same rule as a parent row's "(nD)"). Overlapping tasks don't add up. Planned and actual are measured alike. |
| 2026-11-02 | Task count          | **Top-level (main) tasks**, with or without subtasks; hover shows "5 Main Tasks, 10 Edge Tasks (Without Subtasks)". Rows inside collapsed parents still count.                             |
| 2026-11-01 | Summary layout      | **Two lines in the task panel's header cell: totals on top** (level with the month row), **"Task Name" underneath** (level with the day row, right above the task names).                  |
| 2026-11-01 | Milestone summary   | **Text beside the Milestones button**, in the style of the critical-path count: "5 Milestones · 3 Upcoming".                                                                               |
| 2026-11-02 | Actual Dates toggle | **A toggle button like Critical Path** (icon + "Actual Dates", `aria-pressed`), **just left of Critical Path**, **on by default**, remembered **per browser** (like Daily/Weekly).         |
| 2026-11-02 | Focus ring          | The keyboard focus ring shows only after real keyboard use (Tab, arrows, Space, Enter) — **not after Shift, ⌘ or shortcuts** following a click.                                            |
| 2026-11-02 | Text case           | Labels in Title Case app-wide; small words lowercase unless first/last; sentences unchanged (rule in `CLAUDE.md` → Code style).                                                            |

## Project summary (task panel header)

- Top line: `5 Tasks · Planned 45D · Actual 30D`. Figures in the text colour, labels muted;
  "Actual" has a short blue line sample (the actual line's colour), so it doubles as a legend.
- Bottom line: "Task Name" (larger, semi-bold, centred).
- **Tasks**: top-level (main) tasks, with or without subtasks. Hover: "5 Main Tasks, 10 Edge
  Tasks (Without Subtasks)" — edge tasks are tasks without subtasks at any depth, so a top-level
  task without subtasks is both.
- **Planned**: weekdays from the earliest planned start to the latest planned finish over all
  dated tasks (parents span their subtasks, as on the timeline). "—" when nothing is dated.
- **Actual**: the same over actual dates; a task started but not finished runs **up to today**
  (as the blue line does). "—" when no task has actual dates.
- Tooltips: "Planned: Mon 2 Nov 2026 – Fri 1 Jan 2027 (45 Weekdays)", "Actual: … (30 Weekdays,
  In Progress)", "Planned: No Dates Yet".
- Covers the whole project, whatever is collapsed; updates after every change, undo included.
- Phones (panel 196 px): 11 px type, no dots or line sample, "Plan" instead of "Planned"
  (screen readers still hear "Planned"). Typical figures fit on one line; very long ones
  (e.g. 120 Tasks · 450D · 300D) wrap to two tight lines instead of being cut off.

## Milestone summary (beside the Milestones button)

- `5 Milestones · 3 Upcoming`; `1 Milestone · 1 Upcoming`; `3 Milestones · All Passed`;
  `No Milestones`.
- Upcoming = today or later; passed = before today. Tooltip names the next one:
  "Next: Beta — Thu 12 Nov 2026" ("All milestones have passed" when none are left).
- The button and text are left-aligned in the toolbar above the task list, so the button
  doesn't shift when the text changes.

## Actual Dates toggle (timeline toolbar)

- `[Daily | Weekly] [Today] [▭ Actual Dates] [Critical Path] 3 Critical Tasks` — left of
  Critical Path so the critical count stays beside its own button and nothing moves when the
  critical path is toggled.
- Same kind of control as Critical Path: a button with an icon (a bar with the blue actual line
  under it, which doubles as a legend) and `aria-pressed`. On: blue border, light blue fill, blue
  text. Off: a plain button.
- The toolbar wraps onto a second line when it doesn't fit (e.g. at 375 px).
- Off: the blue actual lines aren't drawn. Nothing else changes — actual dates stay in the task
  dialog, the file and the summary. Not part of undo (a view setting, not an edit). Stored in
  `localStorage` (`gantt-chart:show-actual-dates`).

## Focus ring

Chrome draws the keyboard focus ring (`:focus-visible`) on a clicked button as soon as any key
is pressed — even Shift or ⌘ alone (a screenshot shortcut, ⌘Z) — which made an off toggle look
half on. `utils/inputModality.ts` sets `data-input="pointer" | "keyboard"` on `<html>`, ignoring
modifiers and shortcuts; `global.css` hides the ring while it's `pointer`. Tab, arrows, Space and
Enter still show it. Covers every button, the Daily/Weekly control and the task dialog's
priority options. E2E-guarded.

## Milestone ◆ stacking

A milestone's ◆ hangs below the date header. The task panel stacks above the header, so when the
milestone's day scrolls behind the panel the ◆ doesn't show over the first task row.
E2E-guarded.

## Data model

No change (schema stays 4).

## Out of scope

Sum-of-days / effort totals, per-branch subtotals, % complete, baseline variance, a project
statistics dialog.
