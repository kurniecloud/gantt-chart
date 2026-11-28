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
{ "format": "gantt-chart", "schemaVersion": 5, "exportedAt": "2026-11-04", "project": { ... } }
```

- Export: header button (and Yes in the New dialog) → `downloadProject()` (`src/io/download.ts`):
  `serializeProject()` + `downloadTextFile()`, file named `exportFileName()` (slug of the title).
- Import: header button → hidden file input → `parseProjectFile()`: checks `format`, runs
  `migrateProject()` (older schemas upgrade), then validates every task, parent chain (no loops),
  task order, dependency and milestone. Any problem → `ProjectFileError` with a readable reason
  shown in a dialog; nothing changes. Valid → confirm dialog → `importProject()` command
  replaces the open project's content (keeps its id), undoable in one step.
- Task order is rebuilt so each task precedes its subtasks. Milestones keep the file's order (the
  Milestones dialog sorts them by date when it opens). Dialog titles: `Import “file”?`
  (confirm) and `Couldn’t Import “file”` (error).

- JSON Editor (`features/dialogs/JsonEditorDialog.tsx`): the same file text without a file —
  shows `serializeProject()`; Validate and Save run `parseProjectFile()` (plus the 20 MB limit);
  Save dispatches `saveProjectJson()`, which, like `importProject()`, replaces the content and
  keeps the id. Broken JSON reports "line L, column C" via `jsonErrorLocation()`, which reads the
  browser's `JSON.parse` message (line/column, a position, or nothing — Safari).

## Spreadsheet copy (clipboard, not a file)

The JSON Editor's **Spreadsheet** button shows the editor's text as a read-only table and
**Copy Table** puts it on the clipboard (spec `docs/specs/spreadsheet-copy.md`). It is not a file
format: nothing is downloaded or imported.

- Rows: `domain/taskTable.ts` (`taskTable`, `taskStatus`) — outline numbers, status from actual
  dates, parents' dates from their subtasks, links as outline numbers.
- Model: `io/spreadsheet.ts` — `projectSheet()` (title, description, task rows, milestone rows;
  text and date cells) feeds both the on-screen table and the clipboard: `sheetHtml()` (one
  `<table>`, every text cell `mso-number-format:'\@'`, dates `'d mmm yyyy'`, indents
  `mso-char-indent-count`, line breaks `<br style="mso-data-placement:same-cell">`, kept spaces
  `mso-spacerun`) and `sheetText()` (tab-separated, quoted when a cell holds a tab, line break
  or quote).
- Clipboard: `io/clipboard.ts` `copyFormatted()` — `execCommand('copy')` with a `copy` listener
  that sets both types, briefly selecting the table (some browsers fire `copy` only with a
  selection). It needs no permission and writes the HTML exactly as given; the async clipboard
  API is the fallback (the desktop app's browser pane refuses it: "Write permission denied").
  All user text is HTML-escaped.

## Tests

`src/io/projectFile.test.ts` builds files in code. Required: a round trip (export → import →
deep-equal project), older schema versions upgrading, and a malformed file for each validation
rule (it must fail with a readable message, never throw uncaught).
