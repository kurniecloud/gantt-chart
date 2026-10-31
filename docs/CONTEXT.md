# Project context & handover

**Read this at the start of every task. Update it in the same PR as any change that alters
what's below** (status, a decision, a lesson learned, the backlog). It is the memory of the
project between sessions; `CLAUDE.md` holds the always-on rules, this file holds the history
and the why. Last updated: 2026-11-01, after PR #6.

---

## 1. Snapshot

| What           | Where / value                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository     | `git@github.com:kurniecloud/gantt-chart.git` (public), default branch `main`                                                                    |
| Live site      | https://kurniecloud.github.io/gantt-chart/ (deployed by `.github/workflows/deploy.yml` on `main`)                                               |
| Product owner  | GitHub user **kurniecloud** — sets priorities, answers design questions, merges PRs                                                             |
| Stack          | Vite 8 · React 19 · TypeScript 6 (strict) · Zustand 5 + immer 11 · `@tanstack/react-virtual` 3 · `react-day-picker` 10 · `date-fns` 4 · `idb` 8 |
| Tests          | Vitest 5 + Testing Library (336 tests, 23 files) · Playwright 1.64 Chromium (19 e2e)                                                            |
| Runtime        | Node 26 LTS (`.nvmrc`), npm 11                                                                                                                  |
| Schema version | **4** (`src/domain/project.ts`, migrations in `src/persistence/migrations.ts`)                                                                  |
| Bundle         | ~398 KB JS / 124 KB gzipped (PR #6)                                                                                                             |

### History of merged work

| PR  | Branch                                 | What it delivered                                                                                                                        | Spec                                                                                      |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| #1  | `chore/initial-scaffold`               | Vite/React/TS scaffold, domain types + calendar maths, store with undo/redo, IndexedDB autosave, CI + Pages deploy, Claude Code setup    | —                                                                                         |
| #2  | `feat/task-list`                       | Title + description header, nested task list, add/edit/delete dialogs, weekday-only date pickers, priority, schema v2                    | [task-list-and-timeline](specs/task-list-and-timeline.md)                                 |
| #3  | `feat/timeline`                        | Daily/weekly weekday-only timeline, bars, today highlight, shared sticky scroll area, virtualization                                     | same                                                                                      |
| #4  | `feat/import-milestones-critical-path` | JSON import/export, milestones, dependencies, critical path toggle, "(nD)" labels, visual polish, scroll-jump fix, schema v3             | [import-export-milestones-critical-path](specs/import-export-milestones-critical-path.md) |
| #5  | `feat/dependency-arrows`               | Arrows (grey / amber when broken), "Is blocked by" / "Is blocking", driving-chain critical path, weekly gridline fix, new colours        | [dependency-arrows](specs/dependency-arrows.md)                                           |
| #6  | `feat/drag-and-actuals`                | Drag rows to reorder/nest (+ keyboard), drag/resize bars, planned vs actual dates + blue line, blocking critical-path refresh, schema v4 | [drag-and-actuals](specs/drag-and-actuals.md)                                             |

### What the app does today (user's view)

- Project **title + description** edited in place; **Import / Export** a `.gantt.json` file;
  Undo / Redo (buttons and Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y). Autosaves to the browser.
- **Task list** (left): nested to any depth, collapse/expand, "(nD)" weekday count in the
  priority's text colour, ⊕ add subtask, ✕ delete (confirm, warns about subtasks), "+" row.
  Reorder/nest by dragging the ⋮⋮ grip or Alt+Shift+arrows.
- **Task dialog**: name, **Planned** box and **Actual** box (weekday-only pickers), "Is blocked
  by" / "Is blocking" links, priority (None / Urgent / High / Normal / Low).
- **Timeline** (right): Daily / Weekly, Today, ±10 years, weekends hidden; bars coloured by
  priority, parents as brackets; drag to move, edges to resize; grey link arrows (dashed amber
  when dates break a link); blue actual-dates line; light-yellow today; light-green milestones
  with ◆ markers; **Milestones** dialog; **Critical path** toggle (red line, live, input
  blocked while recalculating).

---

## 2. How we work (agreed with the product owner)

1. **Each request is a batch of features.** For every batch: _analyse → find gaps and
   conflicting requirements → ask the open questions → state the defaults you'll use → plan →
   build → verify → one PR._
2. **Questions** go through the question tool: at most 4 at a time, each with the recommended
   option first and labelled "(Recommended)", short descriptions of the consequences. Smaller
   points are not asked — list them as defaults the owner can override. The owner has picked
   the recommendation most of the time, but not always (e.g. parent bars _not_ draggable,
   weekend dates _not selectable_), so never assume.
3. **Spec first**: each batch gets `docs/specs/<slug>.md` with a dated **Decisions** table,
   behaviour, data-model changes and out-of-scope. Mark superseded decisions in older specs.
4. **One branch and one signed PR per batch** (`feat/…`, `fix/…`, `docs/…`). The owner opens and
   merges it on GitHub (merge commits so far). Then: `git switch main && git pull --ff-only`,
   delete the local branch, branch again for the next batch. **Never push to `main`.**
5. **Verify before reporting**: typecheck, lint, format, unit tests in 3+ timezones, build,
   e2e, and look at the app (light/dark, daily/weekly, phone width). Report in plain language:
   what changed, how it was verified, what wasn't verified, and any trade-offs. Bugs found along
   the way are explained (cause → fix → regression test).
6. **The owner reviews by using the app** and sends screenshots of problems; reproduce them
   exactly (e.g. rebuild the plan from the screenshot as a test fixture) before fixing.
7. Close each turn by offering the natural next step (usually the next roadmap item).

---

## 3. Product decisions (newest first)

Details and rationale are in the linked specs. **Superseded** decisions are kept so they
aren't reintroduced by accident.

| Date       | Area             | Decision                                                                                                                                                                                  | Spec                                                                                      |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 2026-11-01 | Reorder          | Drop zones: top ¼ above, bottom ¼ below (expanded parent → first child), middle → last child, "+" row → end. Moves into own subtree or clashing with links are **refused** with a reason. | [drag-and-actuals](specs/drag-and-actuals.md)                                             |
| 2026-11-01 | Bar drag         | Body moves, edges resize, weekday snap, ≥ 1 day; **parent bars are not draggable**; changes planned dates only; linked tasks are not moved.                                               | same                                                                                      |
| 2026-11-01 | Actual dates     | Planned + Actual boxes; an actual date fills an **empty** planned date; parents' actuals span subtasks; blue 4 px line under the bar; **in progress runs to today**.                      | same                                                                                      |
| 2026-11-01 | Critical refresh | Recalculate after every change while on; **always block input**; show "Recalculating…" only if it takes > 0.2 s.                                                                          | same                                                                                      |
| 2026-11-01 | Critical path    | **Driving chain**: from the task(s) finishing last, follow "blocked by" links back through the latest-finishing blocker(s). _Supersedes strict zero-slack (PR #4)._                       | [dependency-arrows](specs/dependency-arrows.md)                                           |
| 2026-11-01 | Links wording    | **"Is blocked by" / "Is blocking"**, both editable. _Supersedes "Depends on" (PR #4)._                                                                                                    | same                                                                                      |
| 2026-11-01 | Arrows           | Grey; **dashed amber** when the blocked task starts on/before its blocker's finish day; parent links connect parent bars; collapsed tasks use the parent.                                 | same                                                                                      |
| 2026-11-01 | Colours          | Priority bars: Urgent `#fca5a5`, High `#fdba74`, **Normal teal `#5eead4`**, **Low light blue `#93c5fd`**, None slate; "(nD)" text uses darker shades.                                     | same                                                                                      |
| 2026-11-01 | Import / export  | Native `.gantt.json`; import **replaces** title, description, tasks, links and milestones of the open project (keeps its id), asks first, one undo.                                       | [import-export-milestones-critical-path](specs/import-export-milestones-critical-path.md) |
| 2026-11-01 | Dependencies     | Finish-to-start only, no lag; links to/from a parent apply to all its subtasks; loops refused (including through parents).                                                                | same                                                                                      |
| 2026-11-01 | Critical toggle  | A toggle that stays live while on; toolbar shows the count of critical subtasks.                                                                                                          | same                                                                                      |
| 2026-11-01 | Milestones       | Project-level `{ name, date }` list in a dialog table; weekday dates; green day + ◆ marker with tooltip. Today's yellow wins if both.                                                     | same                                                                                      |
| 2026-11-01 | Timeline polish  | "Task name" larger & centred; month labels centred (sticky); "(nD)" labels; lighter colours; 4 day lines per week; **today light yellow, own day only** (_was light green, whole week_).  | same                                                                                      |
| 2026-10-31 | Parent dates     | A parent with dated subtasks **spans them** (read-only in the dialog); otherwise its own dates.                                                                                           | [task-list-and-timeline](specs/task-list-and-timeline.md)                                 |
| 2026-10-31 | Partial dates    | Start only or end only → **one-day bar**; neither → no bar.                                                                                                                               | same                                                                                      |
| 2026-10-31 | Weekends         | **Not selectable** in date pickers (calendar greys them out); the timeline has no weekend columns.                                                                                        | same                                                                                      |
| 2026-10-31 | Timeline         | Daily (48 px/day) default, Weekly (144 px/week, labels "28 Sep - 2 Oct"), ±10 years, opens on today (next Monday on weekends), view remembered per browser.                               | same                                                                                      |
| 2026-10-31 | First launch     | Empty "Untitled project" (no sample data).                                                                                                                                                | same                                                                                      |

---

## 4. Where things live (beyond `CLAUDE.md`'s layout)

| Concern                   | Code                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Weekday coordinate system | `domain/workweek.ts` (`weekdayIndex`), `features/timeline/scale.ts` (daily/weekly scale)      |
| Planned / actual spans    | `domain/taskDates.ts` — `effectiveSpans(project, 'planned' \| 'actual', today?)`, `shiftSpan` |
| Hierarchy                 | `domain/tree.ts` (`visibleTaskRows`, `descendantIds`, insert positions)                       |
| Moves                     | `domain/move.ts` (`planMove`), command `moveTask`, UI `features/tasks/useRowDrag.ts`          |
| Links                     | `domain/dependencies.ts` (`linkCandidates`, `leafSuccessors`, `linkProblem`)                  |
| Critical path             | `domain/criticalPath.ts` (driving chain), `features/criticalPath/` (refresh + overlay)        |
| Arrows                    | `features/timeline/arrows.ts` (routing), `DependencyArrows.tsx` (SVG)                         |
| Bar drag                  | `features/timeline/useBarDrag.ts`, command `shiftTaskDates`                                   |
| Commands (undo)           | `store/commands/*` — `{ label, apply(draft) }`, immer patches                                 |
| UI-only state             | `store/uiStore.ts` (open dialog), `store/viewStore.ts` (view mode, critical toggle, busy)     |
| File format               | `io/projectFile.ts` (validation of untrusted files), `io/download.ts`                         |
| Test helpers              | `src/test/fixtures.ts` (`makeProject`), `src/test/setup.ts` (jsdom shims)                     |

---

## 5. Lessons learned (read before changing these areas)

**Layout & rendering**

- **Never add `scroll-padding-left`** to the workspace scroller: focus returning to the pinned
  task panel (e.g. when a dialog closes) makes the browser scroll the timeline sideways by the
  panel width each time. Guarded by `tests/e2e/timeline.spec.ts` ("does not move sideways").
- **Never draw repeating gridlines with a fractional tile** (e.g. 144/5 = 28.8 px): browsers
  round each tile and the lines drift. Draw them inside one whole-number tile. Guarded by the
  pixel test `tests/e2e/gridlines.spec.ts`.
- Position the scroller with `scrollTo()`, not `scrollLeft =`: the virtualizers listen for the
  `scroll` event (and the jsdom shim fires it only from `scrollTo`).
- Rows are virtualized: drag and keyboard code must not rely on a row staying mounted (use
  window listeners; focus by index after `scrollToIndex`).
- SVG boxes include stroke and markers; to check where a line really starts/ends, use
  `getPointAtLength()` + `getScreenCTM()` (see the arrow e2e test).

**React / dialogs**

- React's `autoFocus` runs before `<dialog>.showModal()` (content hidden) → mark the target
  with `data-autofocus`; `Dialog` focuses it after opening.
- A `<dialog>`'s `close` event is async; with StrictMode remounts it can arrive after reopening →
  `Dialog` ignores `close` while still open.
- `eslint-plugin-react-hooks` v7 forbids `setState` directly in effects: remount with a `key`
  (see header fields) or set state from async callbacks (see `useCriticalPath`).
- `useVirtualizer` triggers `react-hooks/incompatible-library`; it's disabled with a comment
  (the project doesn't use the React Compiler).

**Dates & tests**

- Anything that depends on "today" must pin the clock: `vi.useFakeTimers({ toFake: ['Date'] })`
  - `vi.setSystemTime(...)` in Vitest, `page.clock.setFixedTime(...)` in Playwright. A test
    that assumed the current month failed in UTC on 31 Oct while passing in Tokyo.
- Run unit tests in several timezones (CI does UTC-8 and UTC+9; locally also UTC, UTC+14).
- jsdom has no `showModal`, layout, `scrollTo` or scroll events → shims in `src/test/setup.ts`
  (every element is 1024×768; `scrollTo` fires `scroll`).
- Dates in jsdom tests: the task list sits at y = 0, rows are 36 px — pointer-event drag tests
  rely on that.

**Tooling**

- Prettier re-wraps files after edits: re-read before string-replacing, or use the Edit tool.
- Writing ` ` through tools can produce a literal non-breaking space; keep explicit escapes
  and check with a byte dump.
- `tsc` type-checks `tests/`, and the e2e web server runs `npm run build` (which type-checks):
  throwaway Playwright scripts must start with `// @ts-nocheck` and be deleted afterwards.
- After installing a dependency, **restart the Vite dev server** (mixed pre-bundled React
  copies → "Invalid hook call").
- In the Claude desktop app the browser pane is often hidden: screenshots lag, smooth scrolling
  and CSS animations pause. Verify by reading DOM/state with JS, or take screenshots with a
  temporary Playwright script (visible headless browser). Pin the clock to a weekday to see
  today's highlight.

**Git / GitHub**

- `main` ruleset: PR required, CodeQL results required, signed commits required. Commits are
  SSH-signed (`~/.ssh/id_ed25519`, repo-local config). `gh` CLI isn't installed — give the owner
  the compare URL `https://github.com/kurniecloud/gantt-chart/compare/main...<branch>?expand=1`.
- Verifying GitHub's own merge commits locally prints "cannot run gpg" (no gpg installed) —
  harmless.

---

## 6. Environment (owner's Mac)

- macOS (Apple Silicon), Homebrew Node 26.13, npm 11. npm reports `fsevents` install script
  "not covered by allowScripts" — harmless (prebuilt binary loads).
- Git identity (repo-local): `kurniecloud <7161621+kurniecloud@users.noreply.github.com>`;
  SSH key `~/.ssh/id_ed25519` is registered on GitHub as both **authentication** and **signing**
  key (no passphrase).
- Playwright Chromium is installed (`npx playwright install chromium` if missing).
- `.claude/launch.json`: `dev` (5173) and `preview` (4173, build first).

---

## 7. Backlog and open follow-ups

Roughly in the order they'd make sense; confirm with the owner before starting.

| Candidate                                                      | Notes                                                                                                                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-scheduling** (blocked tasks follow their blockers)      | Offered after PR #6. Today nothing moves automatically; broken links just turn amber. Needs a decision on manual vs auto tasks (roadmap 2.5) — see `scheduling-engine` skill. |
| Horizontal auto-scroll while dragging a bar                    | Row drags auto-scroll vertically; bar drags don't scroll sideways yet.                                                                                                        |
| Touch: drag a bar's body                                       | On phones the body scrolls the timeline; edge handles and row grips work by touch.                                                                                            |
| Drag-to-link between bars (1.9)                                | Links are edited in the dialog only.                                                                                                                                          |
| Project list / switch / new project UI (0.4)                   | Storage supports several projects; UI shows one.                                                                                                                              |
| Light/dark toggle (1.12)                                       | Follows the OS today.                                                                                                                                                         |
| Baselines (2.6) / variance                                     | Overlaps with planned vs actual — decide how they relate before building.                                                                                                     |
| CSV / MS Project XML import-export (2.9, 2.10)                 | Mappings drafted in the `import-export` skill.                                                                                                                                |
| Search / filter / group (4.2), PNG/PDF export (4.5), PWA (4.7) | Phase 4.                                                                                                                                                                      |

**Known technical debt**

- `TaskBar`'s `memo` is mostly ineffective (drag/edit callbacks aren't stable) — fine at
  current scale (only visible bars render).
- `Task.mode`, `percentComplete`, calendars, resources, baselines, custom fields exist in the
  model but have no UI yet.
- The `scheduling-engine` skill describes the future auto-scheduler (MS Project semantics);
  today's critical path deliberately uses the driving-chain rule.
