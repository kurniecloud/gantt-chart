---
name: add-feature
description: End-to-end workflow for adding a feature to the Gantt app — spec, domain logic with tests, store command with undo, UI, e2e test, roadmap update. Use whenever the user asks to build or implement a feature from docs/PRODUCT.md or a new one.
---

# Add a feature

Follow these steps in order. Skip a step only when it clearly does not apply (e.g. a pure
styling change has no domain step) and say which steps you skipped.

## 1. Pin down the behaviour

- Find the feature row in `docs/PRODUCT.md`. If there is a spec in `docs/specs/`, read it.
- If the behaviour is non-trivial and unspecified, write a short spec in
  `docs/specs/<feature-slug>.md` first (the `product-analyst` agent can research competitors).
  Include worked examples with concrete dates and numbered acceptance criteria.
- Mark the row 🟨 in `docs/PRODUCT.md`.

## 2. Domain (`src/domain/`)

- Add/extend types in `src/domain/types.ts`. If the persisted shape changes, bump
  `CURRENT_SCHEMA_VERSION` and add a migration in `src/persistence/migrations.ts` with a test.
- Write failing Vitest cases from the worked examples, then implement as pure functions.
- Scheduling-related? Follow the `scheduling-engine` skill.

## 3. Store command (`src/store/commands/`)

- One command per user intent (`moveTask`, `linkTasks`, `indentTasks`…): a factory returning
  `{ label, apply(draft) }` (see `projectCommands.ts`). Undo comes from immer's inverse
  patches. Batch multi-task edits into a single command so one undo reverts them.
- Test via the store: `dispatch` → `undo` → project deep-equals the original; `redo` → equals
  the post-command state (pattern in `projectStore.test.ts`).

## 4. UI (`src/features/…`)

- Follow the `gantt-rendering` skill for timeline work.
- Read via selectors, write via commands. Keyboard access + accessible names required.
- Add a keyboard shortcut if the competitor equivalent has one, and list it in the
  shortcuts panel.

## 5. Tests

- Component tests for new UI; a Playwright spec in `tests/e2e/` for the main user flow.
- Run: `npm run typecheck && npm run lint && npm run test && npm run test:e2e`.

## 6. Look at it

Start the dev server and exercise the feature in the browser (light + dark, two zoom
levels). State what you checked.

## 7. Close out

- Mark the row ✅ in `docs/PRODUCT.md` (or leave 🟨 and say what remains).
- Suggest a Conventional Commit message, e.g. `feat(timeline): drag to create dependencies`.
