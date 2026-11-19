# Spec: resizable task panel

Status: done (PR #16).

## Decisions (agreed with the product owner)

| Date       | Topic    | Decision                                                                                                                                  |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-19 | Divider  | A **draggable divider** between the task panel and the timeline.                                                                          |
| 2026-11-19 | Limits   | **Narrowest: the panel's previous fixed width (320 px). Widest: half the window.**                                                        |
| 2026-11-19 | Names    | Task and subtask names use the width they get: they end in "…" only while they don't fit, and show in full once the panel is wide enough. |
| 2026-11-19 | Remember | The width is **remembered per browser**, like Daily/Weekly: the same for every project, not saved in files, not part of undo.             |
| 2026-11-19 | Phones   | **No divider on phones** (720 px wide or less): half the screen is narrower than the phone panel (196 px), which stays fixed.             |

## Behaviour

- The divider is the panel's right edge, from the toolbar down to the bottom: an 8 px grab area
  over the border. It turns blue on hover and while dragging, and the pointer shows a resize
  arrow. Its tooltip: "Drag to resize the task panel; double-click to reset it".
- Drag with the mouse, pen or a finger; the panel follows the pointer and the width is saved
  when it's released. Double-click goes back to the narrowest width.
- Keyboard: Tab reaches the divider (a blue line shows it has focus); ←/→ move it 16 px,
  Shift+←/→ 64 px, Home/End jump to the narrowest/widest. Screen readers hear "Resize Task
  Panel, separator" with the width in pixels.
- What follows the width: the Milestones part of the toolbar, the totals and "Task Name", every
  row (the "(7D)" label, ⊕ and ✕ stay at the right; the name takes the rest).
- The timeline keeps the same dates in view while the panel changes width.
- If the window gets narrower than twice the chosen width, the panel shrinks to half the window;
  it returns to the chosen width when the window is wide enough again.

## Data model

No change to the saved data. The width is a browser preference (`localStorage`
`gantt-chart:task-panel-width`).

## Out of scope

Collapsing the panel completely, a divider on phones, resizing columns inside the task list.
