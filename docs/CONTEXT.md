# Project context & handover

**Read this at the start of every task. Update it in the same PR as any change that alters
what's below** (status, a decision, a lesson learned, the backlog). It is the memory of the
project between sessions; `CLAUDE.md` holds the always-on rules, this file holds the history
and the why. Last updated: 2026-11-02, after PR #9.

---

## 1. Snapshot

| What           | Where / value                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository     | `git@github.com:kurniecloud/gantt-chart.git` (public), default branch `main`                                                                    |
| Live site      | https://kurniecloud.github.io/gantt-chart/ (deployed by `.github/workflows/deploy.yml` on `main`)                                               |
| Product owner  | GitHub user **kurniecloud** — sets priorities, answers design questions, merges PRs                                                             |
| Stack          | Vite 8 · React 19 · TypeScript 6 (strict) · Zustand 5 + immer 11 · `@tanstack/react-virtual` 3 · `react-day-picker` 10 · `date-fns` 4 · `idb` 8 |
| Tests          | Vitest 5 + Testing Library (380 tests, 27 files) · Playwright 1.64 Chromium (25 e2e)                                                            |
| Runtime        | Node 26 LTS (`.nvmrc`), npm 11                                                                                                                  |
| Schema version | **4** (`src/domain/project.ts`, migrations in `src/persistence/migrations.ts`)                                                                  |
| Bundle         | ~402 KB JS / 124 KB gzipped (PR #9)                                                                                                             |

### History of merged work

| PR  | Branch                                 | What it delivered                                                                                                                         | Spec                                                                                      |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| #1  | `chore/initial-scaffold`               | Vite/React/TS scaffold, domain types + calendar maths, store with undo/redo, IndexedDB autosave, CI + Pages deploy, Claude Code setup     | —                                                                                         |
| #2  | `feat/task-list`                       | Title + description header, nested task list, add/edit/delete dialogs, weekday-only date pickers, priority, schema v2                     | [task-list-and-timeline](specs/task-list-and-timeline.md)                                 |
| #3  | `feat/timeline`                        | Daily/weekly weekday-only timeline, bars, today highlight, shared sticky scroll area, virtualization                                      | same                                                                                      |
| #4  | `feat/import-milestones-critical-path` | JSON import/export, milestones, dependencies, critical path toggle, "(nD)" labels, visual polish, scroll-jump fix, schema v3              | [import-export-milestones-critical-path](specs/import-export-milestones-critical-path.md) |
| #5  | `feat/dependency-arrows`               | Arrows (grey / amber when broken), "Is blocked by" / "Is blocking", driving-chain critical path, weekly gridline fix, new colours         | [dependency-arrows](specs/dependency-arrows.md)                                           |
| #6  | `feat/drag-and-actuals`                | Drag rows to reorder/nest (+ keyboard), drag/resize bars, planned vs actual dates + blue line, blocking critical-path refresh, schema v4  | [drag-and-actuals](specs/drag-and-actuals.md)                                             |
| #7  | `docs/context-handover`                | This handover document                                                                                                                    | —                                                                                         |
| #8  | `feat/summaries-actual-toggle`         | Project totals above "Task name", milestone count, "Actual dates" toggle, milestone ◆ stacking fix                                        | [summaries-and-actual-toggle](specs/summaries-and-actual-toggle.md)                       |
| #9  | `fix/focus-ring-task-count`            | Focus ring only after real keyboard use (not Shift/⌘ after a click); totals count top-level tasks (hover: main / edge); Title Case labels | [summaries-and-actual-toggle](specs/summaries-and-actual-toggle.md)                       |

### What the app does today (user's view)

- Project **title + description** edited in place; **Import / Export** a `.gantt.json` file;
  Undo / Redo (buttons and Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y). Autosaves to the browser.
- **Totals** above "Task Name": "5 Tasks · Planned 45D · Actual 30D" — top-level tasks (hover:
  "5 Main Tasks, 10 Edge Tasks (Without Subtasks)"), and the project's length in weekdays (earliest start → latest finish; actual runs to today
  while in progress). Hover for the dates.
- **Task list** (left): nested to any depth, collapse/expand, "(nD)" weekday count in the
  priority's text colour, ⊕ add subtask, ✕ delete (confirm, warns about subtasks), "+" row.
  Reorder/nest by dragging the ⋮⋮ grip or Alt+Shift+arrows.
- **Task dialog**: name, **Planned** box and **Actual** box (weekday-only pickers), "Is Blocked
  By" / "Is Blocking" links, priority (None / Urgent / High / Normal / Low).
- **Timeline** (right): Daily / Weekly, Today, ±10 years, weekends hidden; bars coloured by
  priority, parents as brackets; drag to move, edges to resize; grey link arrows (dashed amber
  when dates break a link); blue actual-dates line; light-yellow today; light-green milestones
  with ◆ markers; **Milestones** dialog with "5 Milestones · 3 Upcoming" beside the button;
  **Actual Dates** toggle button (show/hide the blue lines, remembered per browser); **Critical
  Path** toggle (red line, live, input blocked while recalculating).

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

| Date       | Area             | Decision                                                                                                                                                                                                                                 | Spec                                                                                      |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 2026-11-02 | UI text          | **Title Case for all labels** (buttons, headings, field labels, placeholders, options, short counts); small words (a, to, of, by, for…) lowercase unless first/last; **sentences stay sentence case**. Rule in `CLAUDE.md` → Code style. | [summaries-and-actual-toggle](specs/summaries-and-actual-toggle.md)                       |
| 2026-11-02 | Task count       | The totals count **top-level (main) tasks**; hovering shows "5 main tasks, 10 edge tasks (without subtasks)". _Supersedes "tasks without subtasks" (2026-11-01)._                                                                        | same                                                                                      |
| 2026-11-02 | Focus ring       | The keyboard focus ring shows only after real keyboard use (Tab, arrows, Space, Enter), **not after Shift/⌘ or shortcuts** following a click.                                                                                            | same                                                                                      |
| 2026-11-02 | Actual toggle    | **"Actual dates" toggle button styled like Critical path** (icon, `aria-pressed`, blue "on" tint), just left of it; on by default; remembered per browser; hides only the lines. _Supersedes the checkbox of the first build._           | same                                                                                      |
| 2026-11-01 | Totals           | Above "Task name" (top line, level with the month row): ~~tasks without subtasks~~ (superseded 2026-11-02) · **Planned** and **Actual project length** in weekdays (earliest start → latest finish).                                     | same                                                                                      |
| 2026-11-01 | Milestone count  | **Text beside the Milestones button**: "5 milestones · 3 upcoming" (today counts as upcoming); tooltip names the next one. Button now left-aligned.                                                                                      | same                                                                                      |
| 2026-11-01 | Reorder          | Drop zones: top ¼ above, bottom ¼ below (expanded parent → first child), middle → last child, "+" row → end. Moves into own subtree or clashing with links are **refused** with a reason.                                                | [drag-and-actuals](specs/drag-and-actuals.md)                                             |
| 2026-11-01 | Bar drag         | Body moves, edges resize, weekday snap, ≥ 1 day; **parent bars are not draggable**; changes planned dates only; linked tasks are not moved.                                                                                              | same                                                                                      |
| 2026-11-01 | Actual dates     | Planned + Actual boxes; an actual date fills an **empty** planned date; parents' actuals span subtasks; blue 4 px line under the bar; **in progress runs to today**.                                                                     | same                                                                                      |
| 2026-11-01 | Critical refresh | Recalculate after every change while on; **always block input**; show "Recalculating…" only if it takes > 0.2 s.                                                                                                                         | same                                                                                      |
| 2026-11-01 | Critical path    | **Driving chain**: from the task(s) finishing last, follow "blocked by" links back through the latest-finishing blocker(s). _Supersedes strict zero-slack (PR #4)._                                                                      | [dependency-arrows](specs/dependency-arrows.md)                                           |
| 2026-11-01 | Links wording    | **"Is blocked by" / "Is blocking"**, both editable. _Supersedes "Depends on" (PR #4)._                                                                                                                                                   | same                                                                                      |
| 2026-11-01 | Arrows           | Grey; **dashed amber** when the blocked task starts on/before its blocker's finish day; parent links connect parent bars; collapsed tasks use the parent.                                                                                | same                                                                                      |
| 2026-11-01 | Colours          | Priority bars: Urgent `#fca5a5`, High `#fdba74`, **Normal teal `#5eead4`**, **Low light blue `#93c5fd`**, None slate; "(nD)" text uses darker shades.                                                                                    | same                                                                                      |
| 2026-11-01 | Import / export  | Native `.gantt.json`; import **replaces** title, description, tasks, links and milestones of the open project (keeps its id), asks first, one undo.                                                                                      | [import-export-milestones-critical-path](specs/import-export-milestones-critical-path.md) |
| 2026-11-01 | Dependencies     | Finish-to-start only, no lag; links to/from a parent apply to all its subtasks; loops refused (including through parents).                                                                                                               | same                                                                                      |
| 2026-11-01 | Critical toggle  | A toggle that stays live while on; toolbar shows the count of critical subtasks.                                                                                                                                                         | same                                                                                      |
| 2026-11-01 | Milestones       | Project-level `{ name, date }` list in a dialog table; weekday dates; green day + ◆ marker with tooltip. Today's yellow wins if both.                                                                                                    | same                                                                                      |
| 2026-11-01 | Timeline polish  | "Task name" larger & centred; month labels centred (sticky); "(nD)" labels; lighter colours; 4 day lines per week; **today light yellow, own day only** (_was light green, whole week_).                                                 | same                                                                                      |
| 2026-10-31 | Parent dates     | A parent with dated subtasks **spans them** (read-only in the dialog); otherwise its own dates.                                                                                                                                          | [task-list-and-timeline](specs/task-list-and-timeline.md)                                 |
| 2026-10-31 | Partial dates    | Start only or end only → **one-day bar**; neither → no bar.                                                                                                                                                                              | same                                                                                      |
| 2026-10-31 | Weekends         | **Not selectable** in date pickers (calendar greys them out); the timeline has no weekend columns.                                                                                                                                       | same                                                                                      |
| 2026-10-31 | Timeline         | Daily (48 px/day) default, Weekly (144 px/week, labels "28 Sep - 2 Oct"), ±10 years, opens on today (next Monday on weekends), view remembered per browser.                                                                              | same                                                                                      |
| 2026-10-31 | First launch     | Empty "Untitled project" (no sample data).                                                                                                                                                                                               | same                                                                                      |

---

## 4. Where things live (beyond `CLAUDE.md`'s layout)

| Concern                   | Code                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Weekday coordinate system | `domain/workweek.ts` (`weekdayIndex`), `features/timeline/scale.ts` (daily/weekly scale)                                                     |
| Planned / actual spans    | `domain/taskDates.ts` — `effectiveSpans(project, 'planned' \| 'actual', today?)`, `shiftSpan`                                                |
| Hierarchy                 | `domain/tree.ts` (`visibleTaskRows`, `descendantIds`, insert positions)                                                                      |
| Moves                     | `domain/move.ts` (`planMove`), command `moveTask`, UI `features/tasks/useRowDrag.ts`                                                         |
| Links                     | `domain/dependencies.ts` (`linkCandidates`, `leafSuccessors`, `linkProblem`)                                                                 |
| Critical path             | `domain/criticalPath.ts` (driving chain), `features/criticalPath/` (refresh + overlay)                                                       |
| Arrows                    | `features/timeline/arrows.ts` (routing), `DependencyArrows.tsx` (SVG)                                                                        |
| Bar drag                  | `features/timeline/useBarDrag.ts`, command `shiftTaskDates`                                                                                  |
| Commands (undo)           | `store/commands/*` — `{ label, apply(draft) }`, immer patches                                                                                |
| UI-only state             | `store/uiStore.ts` (open dialog), `store/viewStore.ts` (view mode, actual dates, critical, busy)                                             |
| Totals / milestone count  | `domain/summary.ts` (`projectSummary`, `milestoneSummary`), `features/workspace/ProjectTotals.tsx`, `MilestonesTool.tsx`, `summaryLabels.ts` |
| Focus-ring modality       | `utils/inputModality.ts` (installed in `main.tsx`) + the `data-input` rules in `styles/global.css`                                           |
| File format               | `io/projectFile.ts` (validation of untrusted files), `io/download.ts`                                                                        |
| Test helpers              | `src/test/fixtures.ts` (`makeProject`), `src/test/setup.ts` (jsdom shims)                                                                    |

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
- **Focus rings after a click**: Chrome turns on `:focus-visible` for the clicked button when
  _any_ key is pressed afterwards — even Shift or ⌘ alone (screenshot shortcuts, ⌘Z). The owner
  saw an "off" toggle with a blue ring that looked "on". `utils/inputModality.ts` ignores
  modifiers and shortcuts; a new focus style must respect `:root[data-input='pointer']` (see the
  Daily/Weekly and priority rules). The desktop app's browser pane sends Shift with `key: ""`,
  which is ignored too; verify keys with Playwright (real key events).
- **Stacking in the workspace**: corner 4 › task panel 3 › date header 2 › body 1. The task panel
  must sit above the header: a milestone's ◆ hangs below the header and showed over the first
  task row once its day scrolled behind the panel (fixed in PR #8, e2e-guarded).
- **Phone width (375 px)** is tight: the timeline toolbar only just fitted before PR #8 and now
  wraps. Check `document.documentElement.scrollWidth <= 375` after adding any control (the
  summaries e2e spec does).
- Short labels on phones: keep the full word for screen readers (visually hidden) and mark the
  short one `aria-hidden`. jsdom ignores CSS, so its `textContent` has both — tests compare the
  text without `aria-hidden` parts (see `summaries.test.tsx`).
- Small text in the actual blue needs `--color-actual-text`; `--color-actual` is only ~3.4:1 on
  the light surface.
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
- Vitest doesn't type-check: a wrong argument type in a test passes `vitest` and then breaks
  `npm run build`, which the e2e web server runs ("Process from config.webServer was not able to
  start. Exit code: 2"). Run `npm run typecheck` before e2e.
- E2E tests that reload must wait for the debounced autosave first (`waitForTimeout(800)`).
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

- Totals and milestone-count details (date ranges, next milestone) are `title` tooltips: not
  reachable by keyboard or touch. A popover would fix that if the owner wants them on phones.
- `TaskBar`'s `memo` is mostly ineffective (drag/edit callbacks aren't stable) — fine at
  current scale (only visible bars render).
- `Task.mode`, `percentComplete`, calendars, resources, baselines, custom fields exist in the
  model but have no UI yet.
- The `scheduling-engine` skill describes the future auto-scheduler (MS Project semantics);
  today's critical path deliberately uses the driving-chain rule.
