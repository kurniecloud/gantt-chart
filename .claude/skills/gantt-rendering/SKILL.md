---
name: gantt-rendering
description: How the task list and timeline are laid out and drawn — the shared sticky scroll area, row/column virtualization, the weekday-only daily/weekly scale, header labels, today highlight, bar geometry and styles, and the patterns for future drag interactions. Use when building or changing anything in src/features/workspace, src/features/timeline or src/features/tasks.
---

# Gantt rendering

Behaviour is specified in `docs/specs/task-list-and-timeline.md`. This skill is how it's built.

## Layout: one scroll area (`features/workspace/Workspace.tsx`)

```
┌ toolbar row: [spacer = task panel width] [Daily|Weekly] [Today] ┐
├ scroller (overflow: auto) ──────────────────────────────────────┤
│ grid: columns [--task-panel-width][--timeline-width]            │
│       rows    [--header-height][max(--rows-height, rest)]       │
│ ┌ corner (sticky top+left) ┐┌ TimelineHeader (sticky top) ────┐│
│ │ "Task name"              ││ month row / day-or-week row      ││
│ ├ taskColumn (sticky left) ┤├ TimelineBody ───────────────────┤│
│ │ TaskList (<ul>)          ││ grid lines, today column, bars   ││
└─┴──────────────────────────┴┴──────────────────────────────────┴┘
```

- Rows line up because both sides are in the same scroll container. **Never** add a second
  scroller or sync scroll positions in JS.
- Sizes come from TS constants in `Workspace.tsx` (`ROW_HEIGHT` 36, `HEADER_HEIGHT` 56, task
  panel 320 px, 196 px under 720 px wide) and are passed down as CSS custom properties.
- `scroll-padding-top` keeps focused rows clear of the pinned header. **Never add
  `scroll-padding-left`:** focus lands in the pinned task panel (e.g. when a dialog closes) and
  the browser would scroll the timeline sideways by the panel width each time (e2e-guarded).

## Virtualization (`@tanstack/react-virtual`)

- **Rows:** one vertical virtualizer, `count = rows + 1` (the "+" row), `scrollMargin` and
  `scrollPaddingStart` = header height. Its items are mapped to `{ index, top }` and passed to
  _both_ `TaskList` and `TimelineBody`. Rows are absolutely positioned with `translateY(top)`.
- **Columns:** one horizontal virtualizer over the scale's columns, `scrollMargin` = panel
  width; only the header renders per-column DOM. Call `measure()` when the scale changes.
- Body grid lines are CSS gradients sized by `--column-width` (no DOM per column); bars are
  only drawn for virtual rows.
- Position the scroller with `scrollTo()` (fires `scroll`, which the virtualizers listen to).
- Keyboard focus moves by row index: `scrollToIndex()` then focus once the row is drawn.

## Scale (`features/timeline/scale.ts`, pure, unit-tested)

- The x axis counts **weekdays only** via `weekdayIndex()` (`domain/workweek.ts`). Column 0 is a
  Monday ~10 years before today; the axis ends ~10 years after.
- Daily: column = 1 weekday, `DAY_WIDTH` 48 px. Weekly: column = Mon–Fri, `WEEK_WIDTH` 144 px,
  and `dayWidth` = 144 / 5, so bars keep exact days inside a week.
- `barGeometry(scale, span)`: `x = (weekdayIndex(start) − origin) × dayWidth`,
  `width = weekdays in span × dayWidth`; weekend ends are trimmed, weekend-only spans → width 0
  (CSS `min-width` draws a 4 px marker).
- `dayRange(scale, date)`: one weekday's slot (a whole column daily, a fifth of the week
  weekly) — used for today (light yellow) and milestones (light green); null on weekends.
- `todayColumn()`: the header cell whose label is emphasised (the day, or the week containing
  today). `initialColumn()`: today, or the next Monday on a weekend (daily).
- `monthColumns()`: a month's full column range, so month labels can be centred.
- Switching views keeps the date at the left edge (`dateAtX` → `columnOfDate`).

## Header labels (`features/timeline/labels.ts`)

Month row "November 2026", centred over the month and kept on screen with `position: sticky`
(left = task panel, right = edge). Daily cells "Mon 2"; weekly cells "28 Sep - 2 Oct". Mondays
get a stronger line in daily view; weekly columns get four thin day lines (CSS gradients). Draw
the day lines inside one week-wide tile at 20/40/60/80% — never a repeating 28.8 px tile, which
the browser rounds and drifts off the week lines (`tests/e2e/gridlines.spec.ts` checks pixels).
Today: `--color-today` slot behind the header cells and in the body. Milestones
(`milestoneMarks()`): `--color-milestone` slot plus a ◆ marker (`role="img"`, name in
`aria-label`/`title`) pinned to the header's bottom edge.

## Bars (`TaskBar.tsx`, `TimelineBody.tsx`)

- Span = `effectiveSpans(project)` (`domain/taskDates.ts`): a parent spans its dated subtasks.
- Leaf bar: 20 px, rounded, `background: var(--bar-color)` where `--bar-color` is
  `var(--color-priority-<level|none>)`. Parent (has children): 14 px bracket via `clip-path`.
- `aria-label`/`title` = `barLabel()` ("Design: Mon 2 Nov 2026 – Fri 6 Nov 2026 · High
  priority"), so colour is never the only signal. Bars are `tabIndex={-1}` buttons — the task
  list is the keyboard path; clicking a bar opens the edit dialog.
- Critical path (toolbar toggle, `domain/criticalPath.ts`, recomputed while on): `data-critical`
  adds a `--color-critical-line` stripe via `::after`, 20 % of the bar's height, centred (in the
  bracket's solid band for parents); the label gains "· Critical".
- Keep `TaskBar` memoized with primitive props.

## Performance (5,000 tasks, production build)

Measured: ~2 ms per vertical scroll step, ~1 ms horizontal, ~6 ms view switch, ~20–35 ms to
collapse/expand. `src/features/workspace/performance.test.tsx` guards that only on-screen rows
are drawn. Never read layout inside scroll handlers; derive everything from the scale.

## Dependency arrows (`arrows.ts`, `DependencyArrows.tsx`)

- `dependencyArrows()` (memoized in `Workspace`) maps each link to visible rows (a task hidden
  in a collapsed parent uses the parent's row), skips same-row links, merges duplicates, and
  flags **broken** links (blocked task starts on/before its blocker's finish day).
- `arrowPath()`: from the blocking bar's end to the blocked bar's start. With room: out 8 px,
  vertical, in. Without: out 8 px, vertical to the row boundary **next to the target**, back
  past the target's start, in — keeps long verticals beside the source bar.
- One SVG sized to the arrows touching the drawn rows (never the full 250k px width), under the
  bars; grey `--color-arrow`, dashed amber `--color-arrow-broken`; each arrow has a 10 px
  invisible hit stroke with a `<title>` tooltip ("Build → Test").

## Future: drag interactions

Pointer events + `setPointerCapture`; keep drag state in a ref; preview with rAF; commit **one**
command on pointer-up (so one undo reverts the drag); snap to whole weekdays via `dateAtX`;
Esc cancels; auto-scroll within 40 px of the scroller edge.
