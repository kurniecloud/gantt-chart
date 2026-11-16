---
name: import-export
description: The app's one file format, native JSON (`.gantt.json`) — how it is exported, imported, validated and upgraded. Use when working in src/io or changing anything about import or export.
---

# Import / export

**JSON is the only import and export format** (owner's decision): no other file, image or PDF
formats are planned, so don't add one without asking.

All IO is client-side: read with `File.text()`, write with a `Blob` + temporary `<a download>`.

Imported files are **untrusted**: validate everything, cap file size (20 MB, `MAX_FILE_BYTES`),
never `eval`, never inject strings as HTML. Import replaces the open project's content after
validation.

## The `.gantt.json` file — `src/io/projectFile.ts`

```json
{ "format": "gantt-chart", "schemaVersion": 4, "exportedAt": "2026-11-04", "project": { ... } }
```

- Export: header button (and Yes in the New dialog) → `downloadProject()` (`src/io/download.ts`):
  `serializeProject()` + `downloadTextFile()`, file named `exportFileName()` (slug of the title).
- Import: header button → hidden file input → `parseProjectFile()`: checks `format`, runs
  `migrateProject()` (older schemas upgrade), then validates every task, parent chain (no loops),
  task order, dependency and milestone. Any problem → `ProjectFileError` with a readable reason
  shown in a dialog; nothing changes. Valid → confirm dialog → `importProject()` command
  replaces the open project's content (keeps its id), undoable in one step.
- Task order is rebuilt so each task precedes its subtasks. Dialog titles: `Import “file”?`
  (confirm) and `Couldn’t Import “file”` (error).

- JSON Editor (`features/dialogs/JsonEditorDialog.tsx`): the same file text without a file —
  shows `serializeProject()`; Validate and Save run `parseProjectFile()` (plus the 20 MB limit);
  Save dispatches `saveProjectJson()`, which, like `importProject()`, replaces the content and
  keeps the id. Broken JSON reports "line L, column C" via `jsonErrorLocation()`, which reads the
  browser's `JSON.parse` message (line/column, a position, or nothing — Safari).

## Tests

`src/io/projectFile.test.ts` builds files in code. Required: a round trip (export → import →
deep-equal project), older schema versions upgrading, and a malformed file for each validation
rule (it must fail with a readable message, never throw uncaught).
