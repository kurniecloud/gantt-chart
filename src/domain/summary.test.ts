import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { milestoneSummary, projectLength, projectSummary } from './summary';
import { effectiveSpans } from './taskDates';
import type { Project } from './types';

const TODAY = '2026-11-11'; // Wednesday

function summarise(project: Project, today = TODAY) {
  return projectSummary(project, effectiveSpans(project), effectiveSpans(project, 'actual', today));
}

describe('projectSummary', () => {
  it('is empty for a project without tasks', () => {
    expect(summarise(makeProject())).toEqual({
      taskCount: 0,
      parentCount: 0,
      planned: null,
      actual: null,
      inProgress: false,
    });
  });

  it('counts only tasks without subtasks, including ones inside collapsed parents', () => {
    const project = makeProject({
      tasks: [
        { id: 'Phase 1', collapsed: true },
        { id: 'Design', parent: 'Phase 1' },
        { id: 'Build', parent: 'Phase 1' },
        { id: 'Phase 2' },
        { id: 'Sprint', parent: 'Phase 2' },
        { id: 'Test', parent: 'Sprint' },
        { id: 'Launch' }, // top level, no subtasks: a work item
      ],
    });
    const summary = summarise(project);
    expect(summary.taskCount).toBe(4);
    expect(summary.parentCount).toBe(3);
  });

  it('measures the planned length from the earliest start to the latest finish', () => {
    // A: Mon 2 – Fri 6 Nov (5D), B overlaps it: Wed 4 – Tue 10 Nov, C: Thu 12 – Mon 16 Nov.
    const project = makeProject({
      tasks: [
        { id: 'A', start: '2026-11-02', finish: '2026-11-06' },
        { id: 'B', start: '2026-11-04', finish: '2026-11-10' },
        { id: 'C', start: '2026-11-12', finish: '2026-11-16' },
        { id: 'Undated' },
      ],
    });
    // Mon 2 → Mon 16 Nov: three weeks of weekdays minus Tue–Fri of the last = 11.
    expect(summarise(project).planned).toEqual({
      start: '2026-11-02',
      finish: '2026-11-16',
      days: 11,
    });
  });

  it('uses subtasks’ dates for a parent, as the timeline does', () => {
    const project = makeProject({
      tasks: [
        { id: 'P', start: '2026-10-01', finish: '2026-12-31' }, // ignored: it has dated subtasks
        { id: 'P1', parent: 'P', start: '2026-11-03', finish: '2026-11-05' },
      ],
    });
    expect(summarise(project).planned).toEqual({
      start: '2026-11-03',
      finish: '2026-11-05',
      days: 3,
    });
  });

  it('measures actual dates separately, running work in progress up to today', () => {
    const project = makeProject({
      tasks: [
        { id: 'A', start: '2026-11-02', finish: '2026-11-06', actualStart: '2026-11-03' },
        { id: 'B', start: '2026-11-09', finish: '2026-11-20' },
      ],
    });
    const summary = summarise(project);
    expect(summary.planned?.days).toBe(15);
    expect(summary.actual).toEqual({ start: '2026-11-03', finish: TODAY, days: 7 });
    expect(summary.inProgress).toBe(true);
  });

  it('is not in progress once every started task has finished', () => {
    const project = makeProject({
      tasks: [{ id: 'A', actualStart: '2026-11-02', actualFinish: '2026-11-03' }],
    });
    const summary = summarise(project);
    expect(summary.actual).toEqual({ start: '2026-11-02', finish: '2026-11-03', days: 2 });
    expect(summary.inProgress).toBe(false);
  });
});

describe('projectLength', () => {
  it('counts weekdays only, both ends included', () => {
    // Fri 6 → Mon 9 Nov: the weekend in between doesn't count.
    expect(projectLength([{ start: '2026-11-06', finish: '2026-11-09' }])).toEqual({
      start: '2026-11-06',
      finish: '2026-11-09',
      days: 2,
    });
  });

  it('is null without spans', () => {
    expect(projectLength([])).toBeNull();
  });
});

describe('milestoneSummary', () => {
  const milestones = [
    { id: 'm1', name: 'Kick-off', date: '2026-11-02' },
    { id: 'm2', name: 'Launch', date: '2026-12-04' },
    { id: 'm3', name: 'Beta', date: '2026-11-20' },
    { id: 'm4', name: 'Review', date: TODAY },
  ];

  it('counts today and later as upcoming and finds the next one', () => {
    expect(milestoneSummary(milestones, TODAY)).toEqual({
      total: 4,
      upcoming: 3,
      next: milestones[3],
    });
  });

  it('has no next milestone when all have passed', () => {
    expect(milestoneSummary(milestones, '2026-12-07')).toEqual({
      total: 4,
      upcoming: 0,
      next: null,
    });
  });

  it('picks the first listed when several share the next day', () => {
    const sameDay = [
      { id: 'a', name: 'A', date: '2026-11-20' },
      { id: 'b', name: 'B', date: '2026-11-20' },
    ];
    expect(milestoneSummary(sameDay, TODAY).next?.name).toBe('A');
  });

  it('is empty without milestones', () => {
    expect(milestoneSummary([], TODAY)).toEqual({ total: 0, upcoming: 0, next: null });
  });
});
