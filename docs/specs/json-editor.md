# Spec: JSON Editor

Status: done (PR #14).

For places where file upload and download are blocked: the whole project can be read and
changed as text, with no file involved.

## Decisions (agreed with the product owner)

| Date       | Topic        | Decision                                                                                                                                                                             |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-16 | Button       | A **"JSON Editor"** button in the header, **to the right of Export**: New · Import · Export · JSON Editor.                                                                           |
| 2026-11-16 | Content      | The dialog shows **exactly the text Export downloads** (the `.gantt.json` file: a small header plus the project) in a big text box, and accepts the same text.                       |
| 2026-11-28 | Buttons      | **Validate, Spreadsheet, Cancel, Save**, at the bottom of the dialog. Spreadsheet shows the project as a table to copy into a spreadsheet ([spreadsheet-copy](spreadsheet-copy.md)). |
| 2026-11-16 | Validate     | Runs **everything Import checks**: JSON syntax and the project rules. "Valid" therefore means Save will work.                                                                        |
| 2026-11-16 | Notification | **A message in the dialog**, just above the buttons: green when valid, red with the reason when not. It clears as soon as the text changes.                                          |
| 2026-11-16 | Cancel       | Closes the editor and **discards any changes**, without asking.                                                                                                                      |
| 2026-11-16 | Save         | **Saves straight away**, with no confirmation: replaces the whole project and closes. **One undo** restores the previous project.                                                    |

## Behaviour

- Dialog title "JSON Editor"; hint "The whole project, as in an exported .gantt.json file. Saving
  replaces the project; you can undo it with ⌘Z." (Ctrl+Z elsewhere).
- The text box is about 60 % of the screen height (it can be dragged taller), in a monospace font,
  with long lines scrolling sideways instead of wrapping and spell-check off. It opens with the
  cursor at the top. Tab moves to the next button rather than indenting, so keyboard users are
  never trapped in the box.
- Validate, valid: "Valid: 5 tasks and 3 milestones." (tasks counted as the totals count them:
  top-level tasks).
- Validate, not valid — the same reasons Import gives:
  - broken JSON: "This isn't valid JSON (line 3, column 5)." The line and column are shown when
    the browser reports them (Chrome, Edge and Firefox do; Safari doesn't);
  - not a project: "This isn't a Gantt Chart project file.";
  - damaged data: "The project data is damaged: task “Design” has an invalid start date." (up to
    three problems, then "and N more");
  - text over 20 MB: "The text is too large (over 20 MB)."
- Save runs the same check. Valid → replaces the project, closes; the undo tooltip reads "Undo
  Edit JSON (⌘Z)". Not valid → the editor stays open with the reason and the text untouched.
  Unchanged text → just closes, with no undo step.
- Cancel and Esc close the editor and discard the edits.
- As with Import: the project keeps its id (storage still holds one project); text from an older
  schema version is upgraded; the `exportedAt` date in the text is ignored.
- Focus returns to the JSON Editor button when the dialog closes.
- Spreadsheet swaps the text box for a read-only table of the same data, with Copy Table and
  Back to JSON; see [spreadsheet-copy](spreadsheet-copy.md).
- On phones the header's file buttons show text only and Undo / Redo move to a second line; the
  dialog's buttons wrap onto two lines (Validate · Spreadsheet, then Cancel · Save).

## Data model

No change to the saved data.

## Out of scope

Syntax colouring, line numbers, auto-formatting, editing only part of the project, a Copy button
(select all and copy works in the text box).
