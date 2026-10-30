---
name: gantt-rendering
description: How the timeline is drawn and interacted with — time scales and zoom levels, bar/milestone/summary geometry, dependency-arrow routing, SVG layering, virtualization and scroll sync with the grid, and drag/resize/link interactions. Use when building or changing anything in src/features/timeline or src/features/grid.
---

# Gantt rendering & interaction

## Scale

A scale is a pure object built from the zoom level and an origin date:

```ts
type Zoom = 'day' | 'week' | 'month' | 'quarter' | 'year';
const PX_PER_DAY: Record<Zoom, number> = { day: 40, week: 18, month: 5, quarter: 1.8, year: 0.6 };
dateToX(d) = (dayNumber(d) - dayNumber(origin)) * pxPerDay;
xToDate(x) = fromDayNumber(dayNumber(origin) + Math.floor(x / pxPerDay));
```

Two-tier header per zoom: day → (month / day), week → (month / week no.), month →
(year / month), quarter → (year / Q), year → (year / half). Zoom with Ctrl/Cmd + wheel keeps
the date under the cursor fixed.

## Geometry (row height 32 px, bar height 20 px, centred)

- Task bar: `x = dateToX(start)`, `width = (dayNumber(finish) + 1 - dayNumber(start)) * pxPerDay`
  (finish is inclusive). Minimum visible width 2 px.
- Progress: inner rect, `width × pct / 100`.
- Milestone: diamond centred at the **end** of its day (`dateToX(date) + pxPerDay`), 14 px.
- Summary: thin bar (8 px) with downward end caps spanning rolled-up dates.
- Critical tasks: use `--color-critical` fill/stroke when "Show critical path" is on.
- Baseline: thin bar under the main bar when a baseline is shown.
- Non-working days: shaded columns in the background (only at day/week zoom).
- Today line: vertical line at the centre of today's column.

## Layers (bottom → top), one shared horizontal scroll container

1. Background: weekend/holiday shading, column grid lines.
2. Rows: bars, milestones, labels (virtualized).
3. Dependency overlay: a single `<svg>` with `<path>`s for links whose endpoints or span
   intersect the visible rows.
4. Interaction overlay: drag ghost, link-drawing rubber band, tooltips.
5. Today line.

## Dependency arrow routing (FS shown; others mirror the anchor sides)

- Exit from P's right edge (FS/FF) or left edge (SS/SF); enter S's left edge (FS/SS) or right
  edge (FF/SF), arrowhead pointing into the bar.
- If there is ≥ 12 px horizontal room: exit → horizontal stub 8 px → vertical to S's row
  centre → horizontal into S.
- Otherwise route: exit stub → down to the row boundary between P and S → back left past S's
  edge − 8 px → down to S's row centre → into S.
- Highlight connected arrows on bar hover/selection.

## Virtualization & sync

- Grid and timeline use the same `useVirtualizer` instance (fixed row height) over the
  **visible** (non-collapsed) task list; vertical scroll is a single shared container.
- Horizontal virtualization: only render header cells and shading for the visible date range
  plus one screen of overscan.

## Interactions

| Gesture                                  | Result                                                   |
| ---------------------------------------- | -------------------------------------------------------- |
| Drag bar body                            | move; snaps to whole days; keeps duration (working days) |
| Drag left/right edge (6 px hit zone)     | change start / finish                                    |
| Drag progress handle                     | % complete, snapped to 5 %                               |
| Drag from end-circle onto another bar    | create link: source end + target side → FS/SS/FF/SF      |
| Double-click bar                         | open task dialog                                         |
| Click empty row area (task has no dates) | set dates by drag-to-draw                                |
| Shift/Cmd click                          | multi-select; drags apply to all selected                |
| Esc during drag                          | cancel                                                   |

Implementation pattern:

- `pointerdown` → `setPointerCapture`, record origin; keep transient drag state in a ref.
- `pointermove` → schedule one `requestAnimationFrame` to update the ghost only.
- `pointerup` → dispatch **one** command (`moveTasks`, `resizeTask`, `linkTasks`…) so a single
  undo reverts the drag; the scheduler then moves successors.
- Auto-scroll horizontally/vertically when dragging within 40 px of the viewport edge.

## Keyboard

Grid: arrows move the active cell, Enter edits, Tab/Shift+Tab next/prev cell, Alt+Shift+→/←
indent/outdent, Insert adds a task, Delete removes, Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z undo/redo.
Timeline: with a bar focused, ←/→ moves by one day, Shift+←/→ resizes.

## Performance

- `React.memo` on row and bar components; pass primitives, not task objects created per render.
- Compute arrow paths in a memoized selector keyed by (task dates, row indices, zoom).
- Never read layout (`getBoundingClientRect`) inside `pointermove` loops.
