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
| Import fixtures             | —                                | `tests/fixtures/`                  |

## Fixtures

Build projects with the helper in `src/test/fixtures.ts` instead of hand-writing full objects:

```ts
const p = makeProject({
  start: '2026-11-02', // a Monday
  tasks: [
    { id: 'A', name: 'Design', duration: 3 },
    { id: 'B', name: 'Build', duration: 2, deps: [{ from: 'A', type: 'FS', lag: 0 }] },
    { id: 'M', name: 'Launch', duration: 0, deps: [{ from: 'B' }] },
  ],
  holidays: ['2026-11-11'],
});
```

Defaults: Mon–Fri calendar, all tasks auto-scheduled ASAP, top-level unless `parent` is set.

## Conventions

- **Table-driven** domain tests: `it.each([...])` with `{ name, input, expected }` rows, and
  hand-calculated expected dates (write the weekday in a comment: `// Tue`).
- Freeze time: `vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 2))`.
- Commands: `loadProject(makeProject(...))`, snapshot with `structuredClone`, `dispatch(cmd)`,
  `undo()`, expect the project to equal the snapshot (see `src/store/projectStore.test.ts`).
- Persistence: `fake-indexeddb` is loaded in `src/test/setup.ts`, so `src/persistence` code
  runs against a real IndexedDB implementation in tests.
- Components: query by role / label (`getByRole('row', { name: /Design/ })`), interact with
  `@testing-library/user-event`. No snapshot tests of large trees.
- E2E: run against the production build (`npm run preview`); start each test from a fresh
  IndexedDB (new browser context). For drag tests use `page.mouse` with explicit coordinates
  derived from the bar's bounding box.
- Run tests in a second timezone in CI (`TZ=America/Los_Angeles` and `TZ=Asia/Tokyo`) to
  catch date bugs.

## Running

```bash
npm run test -- --run                 # all unit tests once
npx vitest run src/domain/scheduler   # one file
npm run test:e2e                      # Playwright
npx playwright test --ui              # debug e2e interactively
```

Never weaken an assertion to get green; a failing correct test means a bug to report.
