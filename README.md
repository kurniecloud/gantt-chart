# Gantt Chart

A free, stand-alone Gantt chart web application — no back end and no database — inspired by
the ClickUp Gantt view and Microsoft Project. Plan nested tasks on a weekday timeline, link
them, track planned against actual dates, and save your work by exporting a `.gantt.json`
file. Work in progress is also autosaved in your browser, so nothing is lost if you close the
tab.

Live: https://kurniecloud.github.io/gantt-chart/ · Status: Phase 1 (usable Gantt) nearly done —
see the [roadmap](docs/PRODUCT.md).

## What it does today

- Project title and description, edited in place; undo / redo for every change.
- Nested tasks to any depth: add, edit, delete, collapse, reorder and nest by drag or keyboard.
- Task dialog: Planned and Actual dates (weekday-only pickers; an end date needs a start),
  "Is Blocked By" / "Is Blocking" links, priority.
- Timeline: daily and weekly views, weekends hidden, today highlighted; bars coloured by
  priority, drag to move and resize; link arrows (amber when the dates break a link); blue
  actual-dates lines (Actual Dates toggle); Critical Path toggle (driving chain).
- Milestones (dialog, green days with ◆ markers) and project totals (tasks, planned and actual
  length).
- Import / export of the native `.gantt.json` file; follows the OS light / dark setting.

## Planned

- Auto-scheduling, all dependency types with lag, working calendars, constraints, baselines,
  deadlines
- Resources, assignments and workload view
- CSV and Microsoft Project XML import / export; PNG / PDF export
- Project list, light / dark toggle, search / filter / group, PWA

## Development

Requires Node.js 26 LTS (see `.nvmrc`); 22.22+ and 24.15+ also work.

```bash
npm install
npm run dev
```

See [CLAUDE.md](CLAUDE.md) for commands and conventions, [docs/CONTEXT.md](docs/CONTEXT.md) for
the current state and agreed decisions, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for
the design.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via GitHub Actions
(repo Settings → Pages → Source: **GitHub Actions**).
