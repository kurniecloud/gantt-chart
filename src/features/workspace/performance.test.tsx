import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../App';
import { criticalPath } from '../../domain/criticalPath';
import { addDays } from '../../domain/dates';
import { linkCandidates, predecessorIds, successorIds } from '../../domain/dependencies';
import { effectiveSpans } from '../../domain/taskDates';
import { visibleTaskRows } from '../../domain/tree';
import type { Priority } from '../../domain/types';
import { nextWeekday } from '../../domain/workweek';
import { useProjectStore } from '../../store/projectStore';
import { dependencyArrows } from '../timeline/arrows';
import { createScale } from '../timeline/scale';
import { makeProject } from '../../test/fixtures';

const PRIORITIES: (Priority | undefined)[] = ['urgent', 'high', 'normal', 'low', undefined];

/** 500 parents × 9 subtasks = 5,000 tasks, with dates and priorities spread out. */
function bigProject() {
  const tasks: NonNullable<NonNullable<Parameters<typeof makeProject>[0]>['tasks']> = [];
  for (let p = 0; p < 500; p++) {
    tasks.push({ id: `P${p}`, name: `Phase ${p}` });
    for (let c = 0; c < 9; c++) {
      const start = nextWeekday(addDays('2026-11-02', p * 3 + c));
      tasks.push({
        id: `P${p}-${c}`,
        name: `Task ${p}.${c}`,
        parent: `P${p}`,
        start,
        finish: nextWeekday(addDays(start, 4)),
        priority: PRIORITIES[c % PRIORITIES.length],
        deps: c > 0 ? [{ from: `P${p}-${c - 1}` }] : p > 0 ? [{ from: `P${p - 1}` }] : [],
      });
    }
  }
  return makeProject({ tasks });
}

describe('5,000 tasks', () => {
  const project = bigProject();

  it('works out rows and parent dates quickly', () => {
    expect(project.taskOrder).toHaveLength(5000);
    const started = performance.now();
    const rows = visibleTaskRows(project);
    const spans = effectiveSpans(project);
    const elapsed = performance.now() - started;
    expect(rows).toHaveLength(5000);
    expect(spans.size).toBe(5000);
    expect(elapsed).toBeLessThan(100);
  });

  it('calculates the critical path and dependency choices quickly', () => {
    const started = performance.now();
    const result = criticalPath(project);
    const draft = {
      blockedBy: predecessorIds(project, 'P250-4'),
      blocking: successorIds(project, 'P250-4'),
    };
    const candidates = linkCandidates(project, 'P250-4', 'P250', draft).blockedBy;
    const elapsed = performance.now() - started;
    expect(Object.keys(project.dependencies)).toHaveLength(4499); // 8 per phase + 1 to the previous phase
    expect(result.criticalIds.size).toBeGreaterThan(0);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates).not.toContain('P250-5'); // downstream of P250-4
    expect(elapsed).toBeLessThan(250);
  });

  it('routes every dependency arrow quickly', () => {
    const rows = visibleTaskRows(project);
    const spans = effectiveSpans(project);
    const started = performance.now();
    const arrows = dependencyArrows(project, rows, spans, createScale('daily', '2026-11-02'), 36);
    expect(performance.now() - started).toBeLessThan(150);
    expect(arrows.length).toBeGreaterThan(4000);
  });

  it('only draws the rows and bars on screen', () => {
    useProjectStore.getState().loadProject(project);
    render(<App storageAvailable />);
    const drawnRows = within(screen.getByRole('list', { name: 'Tasks' })).getAllByRole('listitem');
    const drawnBars = within(screen.getByRole('group', { name: 'Timeline' })).queryAllByRole(
      'button',
    );
    // A 768px-tall viewport fits about 20 rows; allow for overscan on both sides.
    expect(drawnRows.length).toBeGreaterThan(15);
    expect(drawnRows.length).toBeLessThan(60);
    expect(drawnBars.length).toBeLessThanOrEqual(drawnRows.length);
    expect(drawnRows[0]).toHaveAttribute('aria-setsize', '5001');
  });
});
