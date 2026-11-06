# Product Scope & Roadmap

Goal: a free, offline-capable, browser-only project scheduler that covers what most people need
from a Gantt chart — without accounts, servers or licences.

Status legend: ⬜ not started · 🟨 in progress · ✅ done

## Target users

- Project managers who need dependency-based scheduling (critical path, baselines) without
  paying for a licence.
- Small teams who want a drag-and-drop Gantt chart in a local, private file.

## Phase 0 — Foundation

| #   | Feature                                                      | Status |
| --- | ------------------------------------------------------------ | ------ |
| 0.1 | Vite + React + TS scaffold, lint, tests, CI                  | ✅     |
| 0.2 | GitHub Pages deploy workflow                                 | ✅     |
| 0.3 | Domain types (Project, Task, Dependency, Calendar, Resource) | ✅     |
| 0.4 | IndexedDB autosave + project list                            | 🟨     |

## Phase 1 — MVP (usable Gantt)

Specs: 1.1–1.6, 1.10 [task-list-and-timeline](specs/task-list-and-timeline.md) ·
1.7, 1.13, 1.14 [import-export-milestones-critical-path](specs/import-export-milestones-critical-path.md) ·
1.9 [dependency-arrows](specs/dependency-arrows.md) · 1.8, 1.11, 1.15
[drag-and-actuals](specs/drag-and-actuals.md) · 1.16–1.18
[summaries-and-actual-toggle](specs/summaries-and-actual-toggle.md) · 1.3 (end needs a start)
[end-date-needs-start](specs/end-date-needs-start.md) · 1.19 [task-remarks](specs/task-remarks.md).

| #    | Feature                                                                                                        | Status |
| ---- | -------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1  | Project title and description at the top, edited in place                                                      | ✅     |
| 1.2  | Nested tasks to any depth, indented per level, expand / collapse                                               | ✅     |
| 1.3  | Add / edit dialog: name, weekday-only start & end pickers (end needs a start), priority                        | ✅     |
| 1.4  | Add subtask (⊕) and delete with confirmation (✕) on every row                                                  | ✅     |
| 1.5  | Timeline: daily / weekly views, weekdays only, scroll past & future, today highlighted                         | ✅     |
| 1.6  | Task bars: colour by priority, parents span subtasks, 1-day bars for single dates                              | ✅     |
| 1.7  | Native JSON import / export                                                                                    | ✅     |
| 1.8  | Drag bar to move, drag edges to resize (tasks without subtasks)                                                | ✅     |
| 1.9  | Finish-to-start links: "Is Blocked By" / "Is Blocking" ✅, grey arrows (amber when broken) ✅, drag-to-link ⬜ | 🟨     |
| 1.10 | Undo / redo (Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, Ctrl+Y)                                                             | ✅     |
| 1.11 | Reorder / nest tasks by dragging the grip, or Alt+Shift+arrow keys                                             | ✅     |
| 1.12 | Light / dark theme                                                                                             | 🟨     |
| 1.13 | Project milestones: managed in a dialog, highlighted green with a ◆ marker                                     | ✅     |
| 1.14 | Weekday count "(7D)" per task in its priority colour                                                           | ✅     |
| 1.15 | Planned vs actual dates: two boxes in the dialog, blue actual line under the bar                               | ✅     |
| 1.16 | Project totals above "Task Name": top-level tasks (hover: main / edge counts), planned and actual length       | ✅     |
| 1.17 | Milestone count beside the Milestones button ("5 Milestones · 3 Upcoming")                                     | ✅     |
| 1.18 | "Actual Dates" toggle button to show / hide the blue actual lines (remembered per browser)                     | ✅     |
| 1.19 | Remarks: a plain-text box in the task dialog, below Priority                                                   | ✅     |

## Phase 2 — Advanced scheduling

| #   | Feature                                                                             | Status |
| --- | ----------------------------------------------------------------------------------- | ------ |
| 2.1 | All dependency types: FS, SS, FF, SF, with lead/lag (days or %)                     | ⬜     |
| 2.2 | Working calendars: weekends, holidays, exceptions; per-task calendars               | ⬜     |
| 2.3 | Critical path (CPM forward/backward pass), total & free slack, highlight            | 🟨     |
| 2.4 | Constraints: ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO                           | ⬜     |
| 2.5 | Manual vs auto-scheduled tasks per task                                             | ⬜     |
| 2.6 | Baselines (save up to 11), baseline vs actual bars, variance columns                | ⬜     |
| 2.7 | Deadlines with missed-deadline indicators                                           | ⬜     |
| 2.8 | Configurable columns (show/hide, reorder, custom fields: text/number/date/dropdown) | ⬜     |

## Phase 3 — Resources & collaboration-lite

| #   | Feature                                                      | Status |
| --- | ------------------------------------------------------------ | ------ |
| 3.1 | Resource sheet (work / material, max units, cost rate)       | ⬜     |
| 3.2 | Assignments with units; effort-driven duration               | ⬜     |
| 3.3 | Resource workload / histogram view, over-allocation warnings | ⬜     |
| 3.4 | Cost rollups                                                 | ⬜     |
| 3.5 | Share via URL (compressed project in URL hash) and file      | ⬜     |

## Phase 4 — Polish & productivity

| #   | Feature                                                   | Status |
| --- | --------------------------------------------------------- | ------ |
| 4.1 | Status, priority, assignee avatars, tags, colour-by field | ⬜     |
| 4.2 | Group by / filter / sort / search                         | ⬜     |
| 4.3 | Multi-select and bulk edit / bulk drag                    | ⬜     |
| 4.4 | Board (kanban) and list views over the same data          | ⬜     |
| 4.5 | Keyboard shortcuts panel; command palette                 | ⬜     |
| 4.6 | PWA: installable, offline cache                           | ⬜     |
| 4.7 | Project templates                                         | ⬜     |

## Non-goals

- Real-time multi-user editing, user accounts, or any server component.
- Portfolio management across many projects (one project open at a time).
- Timesheets and billing.
- Any import / export format other than the native `.gantt.json` (JSON).

## Notes on partially done items

- **2.3** — the Critical Path toggle shows the **driving chain** (back from the last task through
  the latest-finishing blocker at each step; spare days don't break it) over the user's own
  planned dates. Slack figures and auto-scheduling (moving tasks) are still to do.

- **0.4** — autosave, reload and `listProjects()` work; a UI to switch/create/delete projects is still to do.
- **1.12** — follows the OS light/dark setting via tokens; a manual toggle (`data-theme`) is still to do.
