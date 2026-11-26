# Spec: Milestones sorted by date as you edit

Status: done (PR #18).

## Decisions (agreed with the product owner)

| Date       | Topic        | Decision                                                                                                                                                                                                              |
| ---------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-26 | When         | The Milestones dialog's rows **re-sort by date, earliest first, as soon as a date is picked or cleared** — not only on Save.                                                                                          |
| 2026-11-26 | Cleared date | A milestone whose date is **cleared moves to the bottom** of the list.                                                                                                                                                |
| 2026-11-26 | Same date    | Milestones on the same day **keep their current order**: the one just given that date goes **after** the others on that day. **Save keeps the dialog's order** (sorted by date only, no longer by name within a day). |
| 2026-11-26 | Move cue     | A row that changes place is **scrolled into view** and its background **flashes the accent tint** (about 1.5 s, then fades). Rows that stay put don't flash.                                                          |

## Behaviour

- Only picking a date (from the calendar) or clearing it (Clear) re-sorts. Typing a name, adding a
  row and deleting a row never move other rows.
- Rows without a date sit at the bottom. "Add Milestone" adds its row at the bottom, as before; a
  cleared row goes to the very bottom, below any other rows without a date.
- The dialog opens already sorted by date (a file imported or saved from the JSON Editor may list
  milestones in any order); same-day milestones keep the order they're stored in.
- After picking or clearing a date, focus returns to that row's date field and follows the row to
  its new place, so keyboard users don't lose it. Screen readers hear "Launch moved to row 3." when
  a row changes place.
- The flash restarts if the same row moves again before it has faded. It is a colour change only
  (nothing slides).
- Save stores the rows in the order shown; Cancel or Esc discards everything, order included. Save
  with no edits (only the opening sort) changes nothing and adds no undo step.
- Every date field in the app (task dialog too) now returns focus to itself after a day is picked
  or Clear is pressed; before, focus fell to the page and the next Tab started over from the top.

## Data model

None. `Project.milestones` keeps its shape; only the order Save writes changes (same-day
milestones are no longer re-ordered by name).

## Out of scope

Sorting by name or by hand (drag), a sort-direction toggle, sorting milestones on import or in
the JSON Editor (their order is kept and the dialog sorts it on opening).
