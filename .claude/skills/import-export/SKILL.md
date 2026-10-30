---
name: import-export
description: File formats the app reads and writes — native JSON, CSV, Microsoft Project XML (MSPDI), and PNG/PDF image export — with field mappings, unit conversions and validation rules. Use when working in src/io or adding any import/export feature.
---

# Import / export

All IO is client-side: read with `File.text()`, write with a `Blob` + temporary `<a download>`.
No dependencies are needed for XML (`DOMParser`, `XMLSerializer`).

Imported files are **untrusted**: validate everything, cap file size (50 MB), never `eval`,
never inject strings as HTML. Import produces a new `Project` and runs the scheduler; report
anything dropped or adjusted in an import summary shown to the user.

## Native JSON (`.gantt.json`)

```json
{ "format": "gantt-chart", "schemaVersion": 1, "exportedAt": "2026-10-30", "project": { ... } }
```

On import: check `format`, run migrations from `schemaVersion`, validate with a schema
(hand-written type guards or `zod`), regenerate ids only on collision.

## CSV

Columns (header row required, case-insensitive):
`WBS, Name, Start, Finish, Duration, % Complete, Predecessors, Resource Names, Notes`.

- Hierarchy from `WBS` (`1.2.3`) or, if absent, from leading spaces/indentation in `Name`.
- `Predecessors` uses MS Project syntax: `3FS+2d, 5SS, 7FF-1d` referencing row WBS/IDs.
- Dates `YYYY-MM-DD` (also accept `M/D/YYYY` on import; always write ISO on export).
- Quote fields per RFC 4180; export with a UTF-8 BOM so Excel opens it correctly.

## MS Project XML (MSPDI)

Namespace `http://schemas.microsoft.com/project`. Key mappings:

| MSPDI                                                                                     | App                                                                           |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Project/MinutesPerDay` (default 480)                                                     | used to convert durations                                                     |
| `Task/UID`                                                                                | stable id mapping (`ID` is the display row number)                            |
| `Task/OutlineLevel` + order                                                               | `parentId` hierarchy (level 0 = project summary task — skip it)               |
| `Task/Start`, `Task/Finish` (`2026-11-02T08:00:00`)                                       | take the date part only                                                       |
| `Task/Duration` (`PT24H0M0S`)                                                             | hours ÷ (MinutesPerDay/60) → working days                                     |
| `Task/Milestone` = 1                                                                      | `durationDays = 0`                                                            |
| `Task/Summary` = 1                                                                        | summary (dates recomputed, not trusted)                                       |
| `Task/PercentComplete`                                                                    | `percentComplete`                                                             |
| `Task/Manual` = 1                                                                         | `mode: 'manual'`                                                              |
| `Task/ConstraintType` 0–7                                                                 | ASAP, ALAP, MSO, MFO, SNET, SNLT, FNET, FNLT                                  |
| `Task/ConstraintDate`                                                                     | constraint date                                                               |
| `Task/Deadline`                                                                           | `deadline`                                                                    |
| `Task/Notes`                                                                              | `notes` (plain text)                                                          |
| `PredecessorLink/PredecessorUID`                                                          | `predecessorId`                                                               |
| `PredecessorLink/Type`                                                                    | 0 = FF, 1 = FS, 2 = SF, 3 = SS                                                |
| `PredecessorLink/LinkLag`                                                                 | **tenths of a minute**; with `LagFormat` 7 (days): `lag / 10 / MinutesPerDay` |
| `LagFormat` 19 / 20                                                                       | percent lag (`LinkLag` / 10 = %)                                              |
| `Calendars/Calendar/WeekDays/WeekDay` (`DayType` 1 = Sunday … 7 = Saturday, `DayWorking`) | `workingWeekdays`                                                             |
| `WeekDay` with `DayType` 0 + `TimePeriod`                                                 | exceptions (holidays / working days)                                          |
| `Resources/Resource`, `Assignments/Assignment`                                            | resources & assignments (`Units` 1 = 100 %)                                   |

Export writes the same fields back, plus a project summary task (UID 0), times of
08:00/17:00, and `SaveVersion` 14. Unsupported elements on import are ignored and counted in
the import summary.

## Image / print export

- PNG: render the visible range (or full project) into an offscreen SVG, serialize, draw to a
  `<canvas>` at 2× DPR, `canvas.toBlob`.
- PDF / print: a print stylesheet that lays out grid + timeline across pages; use
  `window.print()` rather than bundling a PDF library.

## Tests

Keep fixtures in `tests/fixtures/` (small hand-written MSPDI, CSV, JSON files). Required:
round-trip tests (export → import → deep-equal project), each dependency type and lag format,
a malformed file per format (must fail with a readable message, not throw uncaught).
