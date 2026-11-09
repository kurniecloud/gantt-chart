# Spec: New button

Status: done (PR #13).

## Decisions (agreed with the product owner)

| Date       | Topic         | Decision                                                                                                                                 |
| ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-09 | Button        | A **"New"** button in the header, **to the left of Import**: New · Import · Export.                                                      |
| 2026-11-09 | Empty project | With **no task and no milestone, New does nothing**. The button stays clickable; a title or description alone doesn't count as an entry. |
| 2026-11-09 | First dialog  | With any task or milestone, New asks whether to export first, with the buttons **Yes, No, Cancel**.                                      |
| 2026-11-09 | Yes           | **Exports exactly as the Export button does, then clears the project at once**, with no further dialog.                                  |
| 2026-11-09 | No            | Shows a second dialog to **confirm clearing without exporting**.                                                                         |
| 2026-11-09 | Cancel        | Closes the dialog; nothing else happens.                                                                                                 |
| 2026-11-09 | What clears   | **Everything**, as on a first launch: title back to "Untitled Project", description empty, all tasks, links and milestones removed.      |
| 2026-11-09 | Undo          | **One undo restores the whole project** (until the page is reloaded; after that, only an exported file can bring it back).               |

## Behaviour

- First dialog: title "Start a New Project?", the question "Do you want to export the current
  project to a .gantt.json file first?" and a hint saying what is cleared. Yes is the primary
  button; Cancel has the initial focus; Esc cancels.
- Second dialog: title "Clear Without Exporting?", the hint "You can undo this with ⌘Z." (Ctrl+Z
  elsewhere), then Cancel (focused) and a red **Clear Project**. Cancel or Esc closes everything
  rather than going back to the first dialog.
- The undo tooltip names the step: "Undo New Project (⌘Z)".
- The cleared project keeps its id, so the browser still holds one project and autosave overwrites
  it. Its start date becomes today.
- Daily/Weekly, Actual Dates and Critical Path are view settings and stay as they are.
- On phones the New, Import and Export buttons show text only, so the header fits at 375 px.

## Data model

No change (schema stays 4).

## Out of scope

Keeping several projects side by side, a list to switch between them, and a keyboard shortcut for
New.
