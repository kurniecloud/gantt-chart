# Product Scope & Roadmap

Goal: a free, offline-capable, browser-only project scheduler that covers what most people use
in the ClickUp Gantt view and Microsoft Project — without accounts, servers or licences.

Status legend: ⬜ not started · 🟨 in progress · ✅ done

## Target users

- Project managers who need MS Project-style scheduling (dependencies, critical path,
  baselines) without the licence.
- Small teams who like ClickUp's drag-and-drop Gantt but want a local, private file.
- Anyone who receives an `.xml` MS Project file and needs to view or tweak it.

## Phase 0 — Foundation

| #   | Feature                                                      | Status |
| --- | ------------------------------------------------------------ | ------ |
| 0.1 | Vite + React + TS scaffold, lint, tests, CI                  | ✅     |
| 0.2 | GitHub Pages deploy workflow                                 | ✅     |
| 0.3 | Domain types (Project, Task, Dependency, Calendar, Resource) | ✅     |
| 0.4 | IndexedDB autosave + project list                            | 🟨     |

## Phase 1 — MVP (usable Gantt)

| #    | Feature                                                                                     | Status |
| ---- | ------------------------------------------------------------------------------------------- | ------ |
| 1.1  | Split view: task grid (left) + timeline (right), resizable splitter, synced scrolling       | ⬜     |
| 1.2  | Create / edit / delete tasks inline in the grid                                             | ⬜     |
| 1.3  | Hierarchy: indent / outdent, summary tasks with rolled-up dates & progress, collapse/expand | ⬜     |
| 1.4  | WBS numbering (1, 1.1, 1.1.1)                                                               | ⬜     |
| 1.5  | Milestones (zero duration, diamond)                                                         | ⬜     |
| 1.6  | Drag bar to move, drag edges to resize, drag progress handle                                | ⬜     |
| 1.7  | Finish-to-Start dependencies: draw by dragging between bars, arrows rendered                | ⬜     |
| 1.8  | Auto-scheduling: successors move when predecessors change                                   | ⬜     |
| 1.9  | Zoom levels: day / week / month / quarter / year; "today" line; scroll to today             | ⬜     |
| 1.10 | Undo / redo (Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z)                                                  | 🟨     |
| 1.11 | Native JSON import / export                                                                 | ⬜     |
| 1.12 | Light / dark theme                                                                          | 🟨     |

## Phase 2 — MS Project parity (scheduling)

| #    | Feature                                                                             | Status |
| ---- | ----------------------------------------------------------------------------------- | ------ |
| 2.1  | All dependency types: FS, SS, FF, SF, with lead/lag (days or %)                     | ⬜     |
| 2.2  | Working calendars: weekends, holidays, exceptions; per-task calendars               | ⬜     |
| 2.3  | Critical path (CPM forward/backward pass), total & free slack, highlight            | ⬜     |
| 2.4  | Constraints: ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO                           | ⬜     |
| 2.5  | Manual vs auto-scheduled tasks per task                                             | ⬜     |
| 2.6  | Baselines (save up to 11), baseline vs actual bars, variance columns                | ⬜     |
| 2.7  | Deadlines with missed-deadline indicators                                           | ⬜     |
| 2.8  | Configurable columns (show/hide, reorder, custom fields: text/number/date/dropdown) | ⬜     |
| 2.9  | MS Project XML (MSPDI) import / export                                              | ⬜     |
| 2.10 | CSV import / export                                                                 | ⬜     |

## Phase 3 — Resources & collaboration-lite

| #   | Feature                                                      | Status |
| --- | ------------------------------------------------------------ | ------ |
| 3.1 | Resource sheet (work / material, max units, cost rate)       | ⬜     |
| 3.2 | Assignments with units; effort-driven duration               | ⬜     |
| 3.3 | Resource workload / histogram view, over-allocation warnings | ⬜     |
| 3.4 | Cost rollups                                                 | ⬜     |
| 3.5 | Share via URL (compressed project in URL hash) and file      | ⬜     |

## Phase 4 — ClickUp-style polish

| #   | Feature                                                   | Status |
| --- | --------------------------------------------------------- | ------ |
| 4.1 | Status, priority, assignee avatars, tags, colour-by field | ⬜     |
| 4.2 | Group by / filter / sort / search                         | ⬜     |
| 4.3 | Multi-select and bulk edit / bulk drag                    | ⬜     |
| 4.4 | Board (kanban) and list views over the same data          | ⬜     |
| 4.5 | Export to PNG / PDF / print layout                        | ⬜     |
| 4.6 | Keyboard shortcuts panel; command palette                 | ⬜     |
| 4.7 | PWA: installable, offline cache                           | ⬜     |
| 4.8 | Project templates                                         | ⬜     |

## Non-goals

- Real-time multi-user editing, user accounts, or any server component.
- Portfolio management across many projects (one project open at a time).
- Timesheets and billing.

## Notes on partially done items

- **0.4** — autosave, reload and `listProjects()` work; a UI to switch/create/delete projects is still to do.
- **1.10** — undo/redo for every store command, toolbar buttons and Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, Ctrl+Y; done once all task edits are commands.
- **1.12** — follows the OS light/dark setting via tokens; a manual toggle (`data-theme`) is still to do.
