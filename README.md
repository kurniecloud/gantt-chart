# Gantt Chart

A free, stand-alone Gantt chart web application — no back end and no database — inspired by
the ClickUp Gantt view and Microsoft Project. Bring data in by uploading a file, add, update
and delete tasks in the UI, and save your work by exporting it to a JSON file. Work in progress
is also autosaved in your browser, so nothing is lost if you close the tab.

> Status: Phase 0 (foundation) — app shell, task list, undo/redo and local autosave. See the [roadmap](docs/PRODUCT.md).

## Planned features

- Task grid + interactive timeline (drag to move, resize, link)
- Hierarchy with summary tasks, milestones, WBS numbering
- FS / SS / FF / SF dependencies with lag, auto-scheduling, critical path
- Working calendars, constraints, baselines, deadlines
- Resources, assignments and workload view
- Import / export: JSON, CSV, Microsoft Project XML, PNG / PDF
- Works offline; light and dark themes

## Development

Requires Node.js 26 LTS (see `.nvmrc`); 22.22+ and 24.15+ also work.

```bash
npm install
npm run dev
```

See [CLAUDE.md](CLAUDE.md) for commands and conventions, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via GitHub Actions
(repo Settings → Pages → Source: **GitHub Actions**).
