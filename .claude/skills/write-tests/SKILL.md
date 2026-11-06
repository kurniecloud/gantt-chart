---
name: write-tests
description: Testing conventions for this repo — Vitest unit tests for domain and store, Testing Library component tests, Playwright e2e tests, shared project fixtures, and how to run them. Use when adding or fixing tests.
---

# Writing tests

## Where tests go

| What                        | Tool                             | Location                           |
| --------------------------- | -------------------------------- | ---------------------------------- |
| Domain logic (`src/domain`) | Vitest                           | `src/domain/<file>.test.ts`        |
| Store commands              | Vitest                           | `src/store/commands/<cmd>.test.ts` |
| Components                  | Vitest + Testing Library (jsdom) | next to the component              |
| User flows                  | Playwright                       | `tests/e2e/<flow>.spec.ts`         |

## Fixtures

Build projects with the helper in `src/test/fixtures.ts` instead of hand-writing full objects:

```ts
const p = makeProject({
  milestones: [{ name: 'Beta', date: '2026-11-12' }],
  tasks: [
    { id: 'P', name: 'Website', collapsed: true },
    { id: 'A', name: 'Design', parent: 'P', start: '2026-11-02', finish: '2026-11-04' },
    {
      id: 'B',
      name: 'Build',
      parent: 'P',
      start: '2026-11-05',
      priority: 'high',
      deps: [{ from: 'A' }],
    },
    { id: 'L', name: 'Launch', actualStart: '2026-11-03' },
  ],
});
```

List tasks in display order (each parent before its subtasks). Task fields: `name`, `start`,
`finish`, `actualStart`, `actualFinish`, `parent`, `priority`, `notes`, `collapsed`, `deps`
(`{ from, type?, lag? }`). Defaults: project starts Monday 2026-11-02, Mon–Fri calendar, tasks
are manually dated (`mode: 'manual'`) with no dates, top-level unless `parent` is set.

## Conventions

- **Table-driven** domain tests: `it.each([...])` with `{ name, input, expected }` rows, and
  hand-calculated expected dates (write the weekday in a comment: `// Tue`).
- Freeze time with `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(new Date(2026, 10, 4, 10, 0))`
  (fake only `Date`: faking all timers stalls `user-event`); `vi.useRealTimers()` after. Also
  needed whenever a test opens an empty date picker (it opens on today's month).
- Commands: `loadProject(makeProject(...))`, snapshot with `structuredClone`, `dispatch(cmd)`,
  `undo()`, expect the project to equal the snapshot (see `src/store/projectStore.test.ts`).
- Persistence: `fake-indexeddb` is loaded in `src/test/setup.ts`, so `src/persistence` code
  runs against a real IndexedDB implementation in tests.
- Components: query by role / label (`getByRole('button', { name: 'Add Task' })`,
  `getByRole('dialog')`), interact with `@testing-library/user-event`. Accessible names are in
  Title Case like the UI. No snapshot tests of large trees.
- E2E: run against the production build (`npm run preview`); start each test from a fresh
  IndexedDB (new browser context) and pin the clock (`page.clock.setFixedTime`). For drag tests
  use `page.mouse` with explicit coordinates derived from the bar's bounding box. Wait 800 ms
  before a reload (autosave is debounced).
- Run tests in a second timezone in CI (`TZ=America/Los_Angeles` and `TZ=Asia/Tokyo`) to
  catch date bugs.

## Running

```bash
npm run test -- --run                 # all unit tests once
npx vitest run src/domain/summary     # one file
npm run test:e2e                      # Playwright
npx playwright test --ui              # debug e2e interactively
```

Never weaken an assertion to get green; a failing correct test means a bug to report.
