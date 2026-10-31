---
name: scheduling-engine
description: Authoritative rules for how the app computes task dates — calendar-day representation, working-day arithmetic, FS/SS/FF/SF dependencies with lag, constraints, summary rollups, critical path (CPM) and slack, cycle prevention. Use before writing or changing anything in src/domain that touches dates, or when debugging why a task moved.
---

# Scheduling engine rules

Semantics follow Microsoft Project (auto-scheduled tasks, "tasks honour constraint dates"
off for SNLT/FNLT conflicts → shown as negative slack) at **day granularity**.

> **Status:** sections 3–6 describe the future auto-scheduler. Today tasks are manually dated
> (`mode: 'manual'`), links are finish-to-start with no lag, and the critical-path toggle uses the
> agreed **driving chain** rule (`src/domain/criticalPath.ts`, spec
> `docs/specs/dependency-arrows.md`), not zero total slack. Keep that rule unless the product
> owner changes it.

## 1. Date representation

- A date is a calendar day `'YYYY-MM-DD'` (`ISODate`). Never an instant.
- Internally convert to an integer **day number**: `Date.UTC(y, m - 1, d) / 86_400_000`.
  Do all arithmetic on day numbers, convert back with `getUTC*`. This is timezone-proof.
- Never call `new Date('YYYY-MM-DD')`, `toISOString()` on local dates, or `getDay()` on
  local-time Dates. Weekday = `(dayNumber + 4) % 7` (0 = Sunday; 1970-01-01 was a Thursday).
- `start` and `finish` are **inclusive**: a 1-day task has `start === finish`.

## 2. Calendars (`src/domain/calendar.ts`)

```ts
type Calendar = {
  id: string;
  name: string;
  workingWeekdays: boolean[]; // index 0 = Sunday
  exceptions: { date: ISODate; working: boolean; name?: string }[];
};
```

Helpers (all pure, all on a given calendar):

| Function                                  | Meaning                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `isWorkingDay(d)`                         | exception wins over weekday rule                                                |
| `nextWorkingDay(d)` / `prevWorkingDay(d)` | d itself if working, else nearest in that direction                             |
| `addWorkingDays(d, n)`                    | n > 0: move forward n working days; n < 0: backward; n = 0: `nextWorkingDay(d)` |
| `finishFromStart(s, dur)`                 | `dur ≥ 1`: `addWorkingDays(nextWorkingDay(s), dur - 1)`; `dur = 0`: `s`         |
| `startFromFinish(f, dur)`                 | inverse of the above                                                            |
| `workingDaysBetween(a, b)`                | inclusive count of working days in [a, b]                                       |

Guard every loop with a max iteration (e.g. 3,660 days) and throw a clear error if a calendar
has no working days.

## 3. Dependencies

`lagDays` is in working days of the **successor's** calendar; negative = lead.
Percent lag (`lagPercent`) = `round(pred.durationDays × pct / 100)` working days.
Let `P` = predecessor, `S` = successor:

| Type | Constraint on S             | Formula (S's earliest allowed)                               |
| ---- | --------------------------- | ------------------------------------------------------------ |
| FS   | S starts after P finishes   | `S.start ≥ addWorkingDays(P.finish, 1 + lag)`                |
| SS   | S starts after P starts     | `S.start ≥ addWorkingDays(P.start, lag)`                     |
| FF   | S finishes after P finishes | `S.finish ≥ addWorkingDays(P.finish, lag)` → derive start    |
| SF   | S finishes after P starts   | `S.finish ≥ addWorkingDays(P.start, lag - 1)` → derive start |

Milestones (duration 0) sit at the **end** of their day:

- Milestone as FS successor with lag 0 → same date as `P.finish` (not the next day).
- Milestone as FS predecessor → successor starts the next working day.

With several predecessors, take the **latest** requirement. Tasks with no predecessors start
at `max(project.startDate, own constraint)`.

Worked example (Mon–Fri calendar, 2026-11-02 is a Monday):

- A: start 2026-11-02, 3d → finish 2026-11-04 (Wed).
- B FS+0 on A, 2d → 2026-11-05 Thu → 2026-11-06 Fri.
- C FS+1 on B, 1d → skips weekend: start 2026-11-10 (Tue).
- D SS+2 on A, 1d → 2026-11-04 (Wed).
- E FF+0 on B, 3d → finish 2026-11-06, start 2026-11-04.

## 4. Constraints

| Type | Effect in forward pass                                            | Effect in backward pass |
| ---- | ----------------------------------------------------------------- | ----------------------- |
| ASAP | none (default)                                                    | none                    |
| ALAP | none; then schedule at late dates                                 | —                       |
| SNET | `ES = max(ES, date)`                                              | —                       |
| FNET | `EF = max(EF, date)`                                              | —                       |
| SNLT | —                                                                 | `LS = min(LS, date)`    |
| FNLT | —                                                                 | `LF = min(LF, date)`    |
| MSO  | `ES = date` (overrides deps; flag conflict if deps require later) | `LS = date`             |
| MFO  | `EF = date` (same)                                                | `LF = date`             |

Conflicts are never silently dropped: return them in `ScheduleResult.conflicts` so the UI can
show an indicator.

## 5. Summary tasks

- `start = min(children.start)`, `finish = max(children.finish)`,
  `durationDays = workingDaysBetween(start, finish)`.
- `% complete = Σ(child.duration × child.pct) / Σ(child.duration)` (milestones weight 0).
- A dependency on a summary task applies to every leaf descendant.
- Forbid dependencies between a summary and its own ancestors/descendants.
- Summaries cannot be manually scheduled in the MVP.

## 6. Algorithm (`src/domain/scheduler.ts`)

1. Expand summary dependencies to leaves; build adjacency lists.
2. Topological sort (Kahn). If a cycle exists, throw — but cycles should already have been
   prevented by `wouldCreateCycle(graph, predId, succId)` (DFS from succ looking for pred)
   before the command was applied.
3. **Forward pass** in topo order → ES/EF for auto tasks. Manual tasks keep their dates but
   still drive successors.
4. Project finish = max EF.
5. **Backward pass** in reverse topo order → LS/LF, using the inverse formulas
   (e.g. FS: `P.LF ≤ addWorkingDays(S.LS, -(1 + lag))`).
6. Total slack = working days from ES to LS (signed). Free slack = min over successors of the
   gap before the successor's ES requirement. Critical ⇔ total slack ≤ 0.
7. Roll up summaries bottom-up.
8. Return `{ tasks: Record<id, ComputedDates>, projectFinish, criticalIds, conflicts }`.

Incremental mode: given changed ids, recompute forward pass only for their downstream
closure; recompute backward pass fully (it's cheap) when the project finish changes.

## 7. Tests

Every rule above needs a table-driven test. Always include: weekend crossings, a holiday
exception, an extra working Saturday, negative lag, milestone pred/succ, multiple
predecessors, MSO conflicting with a predecessor, and a 5,000-task chain that reschedules in
< 100 ms.
