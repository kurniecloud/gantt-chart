# Gantt Chart — Project Instructions

A stand-alone, browser-only Gantt chart / project-scheduling application, aiming for feature
parity with the ClickUp Gantt view and Microsoft Project. No back end: all data lives in the
browser (IndexedDB) and in files the user imports/exports. Deployed as a static site to
GitHub Pages.

- Product scope & feature roadmap: [docs/PRODUCT.md](docs/PRODUCT.md)
- Architecture & data model: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Scheduling rules (dependency math, calendars, critical path): [.claude/skills/scheduling-engine/SKILL.md](.claude/skills/scheduling-engine/SKILL.md)

## Tech stack

| Concern        | Choice                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| Build          | Vite 8, Node 26 LTS (`.nvmrc`)                                                 |
| Language       | TypeScript 6, `strict: true`, no `any` without a comment saying why            |
| UI             | React 19 function components + hooks, CSS Modules                              |
| State          | Zustand + immer patches, command-based undo/redo                               |
| Timeline       | Custom SVG rendering (no third-party Gantt library)                            |
| Virtualization | `@tanstack/react-virtual`: rows shared by task list and timeline, date columns |
| Dates          | `date-fns`; dates are stored as `YYYY-MM-DD` strings                           |
| Persistence    | IndexedDB via `idb` (autosave), JSON / CSV / MS Project XML import-export      |
| Unit tests     | Vitest + Testing Library                                                       |
| E2E tests      | Playwright                                                                     |
| Lint/format    | ESLint + Prettier                                                              |
| Deploy         | GitHub Actions → GitHub Pages                                                  |

Do not add a server, database, auth provider or any runtime network dependency. The app must
work offline once loaded. New runtime dependencies need a one-line justification in the PR
description; prefer small, tree-shakeable libraries.

## Commands

```bash
npm install          # install deps
npm run dev          # Vite dev server (http://localhost:5173/gantt-chart/)
npm run build        # type-check + production build to dist/
npm run preview      # serve dist/ locally
npm run test         # Vitest in watch mode; `npm run test -- --run` runs once
npm run test:e2e     # Playwright against the production build (first time: npx playwright install chromium)
npm run lint         # ESLint (also enforces that src/domain imports nothing from outer layers)
npm run format       # Prettier write (CI runs format:check)
npm run typecheck    # tsc --noEmit
```

Before saying a change is done, run
`npm run typecheck && npm run lint && npm run format:check && npm run test -- --run`.
For UI changes, also run the app and look at it: `.claude/launch.json` defines the `dev`
server and a `preview` server for the production build (run `npm run build` first). Open
`http://localhost:5173/gantt-chart/` and check light, dark and phone width.

## Source layout

```
src/
  domain/        Pure TypeScript: types, scheduling engine, calendars, WBS, critical path.
                 NO React, NO DOM, NO store imports. 100% unit-testable.
  store/         Zustand stores, commands (for undo/redo), selectors.
  features/
    header/      Title + description (edited in place), Import/Export, undo/redo + shortcuts.
    tasks/       Left panel: nested task list, expand/collapse, row actions, drag/keyboard moves.
    dialogs/     Task, delete, milestones and import dialogs; AppDialogs shows the one in uiStore.
    timeline/    Right panel: weekday scale, date header, bars (drag/resize), arrows, actual line.
    workspace/   The shared scroll area: sticky task panel + header, row/column virtualization.
    criticalPath/ Recalculation after every change while on, and the input-blocking overlay.
  components/    Shared UI: Button/IconButton, Dialog (native <dialog>), DatePicker, icons.
  persistence/   IndexedDB autosave, project list, migrations between schema versions.
  io/            Import/export: native .gantt.json (done); CSV, MS Project XML, PNG/PDF later.
  utils/         Small generic helpers.
tests/e2e/       Playwright specs.
docs/            Product and architecture docs.
```

## Core rules

1. **Domain logic is pure.** Anything that computes dates, durations, dependencies, critical
   path, rollups or WBS numbers goes in `src/domain/` as pure functions with unit tests.
   Components never compute schedule dates themselves.
2. **Dates are calendar days, not instants.** Store task dates as `YYYY-MM-DD` strings and
   do arithmetic through `src/domain/calendar.ts` helpers. Never use `new Date(string)` on a
   date-only string (it parses as UTC and shifts by timezone). Never store `Date` objects
   in state.
3. **Durations are working days** against the project/task calendar unless the field says
   otherwise (`elapsed` durations are flagged explicitly).
4. **All mutations go through commands** in `src/store/commands/` so undo/redo works.
   A command is `{ label, apply(draft) }` (see `commands/types.ts`): `apply` mutates an immer
   draft and the store records the patches + inverse patches, so undo is automatic. One user
   gesture = one command. (Once the scheduler exists, the store re-runs it after each command.)
5. **Schema is versioned.** `Project.schemaVersion` must be bumped with a migration in
   `src/persistence/migrations.ts` whenever the persisted shape changes.
6. **Performance budget:** 5,000 tasks must scroll at 60fps and reschedule in < 100 ms.
   Use virtualization; never render off-screen rows; memoize per-row components.
7. **Accessibility:** every interactive control is keyboard reachable, grid supports
   arrow-key navigation, bars have `aria-label`s, colours meet WCAG AA in light and dark.
8. **GitHub Pages:** `vite.config.ts` sets `base: '/gantt-chart/'`. Use relative asset
   paths and hash-based routing (if routing is added) so deep links work on Pages.

## Code style

- Named exports; one component per file; file name = component name (`TaskBar.tsx`).
- Domain files are `camelCase.ts`; tests sit next to source as `*.test.ts(x)`.
- Props types are declared as `type XProps = {...}` directly above the component.
- Keep comments for _why_, not _what_. No commented-out code.
- CSS: CSS Modules (`*.module.css`) with design tokens from `src/styles/tokens.css`.

## Working in this repo with Claude Code

- **Sub-agents** (`.claude/agents/`): `scheduling-engine-expert`, `gantt-ui-engineer`,
  `test-engineer`, `code-reviewer`, `product-analyst`. Use them when the user asks for them
  or when a task clearly sits in one of their areas and needs a focused pass.
- **Skills** (`.claude/skills/`): `add-feature`, `scheduling-engine`, `gantt-rendering`,
  `import-export`, `deploy-github-pages`, `write-tests`.
- New features follow the `add-feature` skill: spec in `docs/PRODUCT.md` → domain + tests →
  store command → UI → e2e test → update the roadmap status.
- Commit messages: Conventional Commits (`feat(timeline): drag to resize bars`).

## Git & GitHub

- Remote: `git@github.com:kurniecloud/gantt-chart.git` (SSH). Site:
  https://kurniecloud.github.io/gantt-chart/
- `main` is protected by a repository ruleset: **changes only via pull request**, **CodeQL
  code-scanning results required**, **signed commits required**. Never push to `main` directly
  and never force-push it.
- Work on a branch (`feat/…`, `fix/…`, `chore/…`), push it, open a PR; CI runs on the PR.
  Merge with **Squash and merge**.
- Commits are SSH-signed via this repo's git config (`gpg.format=ssh`, `commit.gpgsign=true`).
  If signing fails, stop and report it — don't disable signing.
- After a PR merges: `git switch main && git pull --ff-only`, then delete the merged branch.
