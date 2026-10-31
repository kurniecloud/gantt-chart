import { describe, expect, it } from 'vitest';
import { effectiveSpans } from '../../domain/taskDates';
import { visibleTaskRows } from '../../domain/tree';
import { weekdayIndex } from '../../domain/workweek';
import { makeProject } from '../../test/fixtures';
import { ARROW_HEAD, ARROW_STUB, arrowPath, dependencyArrows } from './arrows';
import { DAY_WIDTH, createScale } from './scale';

const ROW = 36;

describe('arrowPath', () => {
  it('steps out, turns and runs straight in when there is room', () => {
    expect(arrowPath(100, 18, 200, 90, ROW)).toBe(`M100 18H${100 + ARROW_STUB}V90H200`);
  });

  it('routes along the boundary next to the target when it starts too soon (downwards)', () => {
    // Target starts right where the source ends: no room for a straight drop.
    const back = 100 - ARROW_STUB - ARROW_HEAD;
    expect(arrowPath(100, 18, 100, 90, ROW)).toBe(`M100 18H108V72H${back}V90H100`); // boundary above the target
  });

  it('routes along the boundary above when the target is on an earlier row', () => {
    const back = 50 - ARROW_STUB - ARROW_HEAD;
    expect(arrowPath(100, 90, 50, 18, ROW)).toBe(`M100 90H108V36H${back}V18H50`); // boundary below the target
  });
});

describe('dependencyArrows', () => {
  const scale = createScale('daily', '2026-11-04');
  const x = (date: string) => (weekdayIndex(date) - scale.originIndex) * DAY_WIDTH;
  const arrowsFor = (spec: Parameters<typeof makeProject>[0]) => {
    const project = makeProject(spec);
    return dependencyArrows(project, visibleTaskRows(project), effectiveSpans(project), scale, ROW);
  };

  it('joins the end of the blocking bar to the start of the blocked one', () => {
    const [arrow] = arrowsFor({
      tasks: [
        { id: 'A', name: 'Design', start: '2026-11-02', finish: '2026-11-04' },
        {
          id: 'B',
          name: 'Build',
          start: '2026-11-09',
          finish: '2026-11-10',
          deps: [{ from: 'A' }],
        },
      ],
    });
    expect(arrow).toMatchObject({ fromRow: 0, toRow: 1, broken: false, label: 'Design → Build' });
    const end = x('2026-11-05'); // Wed's right edge = Thu's left edge
    expect(arrow!.path).toBe(`M${end} 18H${end + ARROW_STUB}V54H${x('2026-11-09')}`);
  });

  it('connects parent bars when a link names parents', () => {
    const arrows = arrowsFor({
      tasks: [
        { id: 'P', name: 'Planning' },
        { id: 'A', parent: 'P', start: '2026-11-02', finish: '2026-11-03' },
        { id: 'Q', name: 'Build', deps: [{ from: 'P' }] },
        { id: 'B', parent: 'Q', start: '2026-11-05', finish: '2026-11-06' },
      ],
    });
    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({ fromRow: 0, toRow: 2, label: 'Planning → Build' });
  });

  it('draws a hidden task as its collapsed parent, and merges duplicates', () => {
    const arrows = arrowsFor({
      tasks: [
        { id: 'P', name: 'Planning', collapsed: true },
        { id: 'A', name: 'Gather', parent: 'P', start: '2026-11-02', finish: '2026-11-03' },
        { id: 'B', name: 'Write', parent: 'P', start: '2026-11-04', finish: '2026-11-05' },
        {
          id: 'X',
          name: 'Build',
          start: '2026-11-09',
          finish: '2026-11-10',
          deps: [{ from: 'A' }, { from: 'B' }],
        },
      ],
    });
    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({
      fromRow: 0,
      toRow: 1,
      label: 'Gather → Build\nWrite → Build',
    });
  });

  it('skips links inside one collapsed row and links to undated tasks', () => {
    expect(
      arrowsFor({
        tasks: [
          { id: 'P', collapsed: true },
          { id: 'A', parent: 'P', start: '2026-11-02', finish: '2026-11-03' },
          {
            id: 'B',
            parent: 'P',
            start: '2026-11-04',
            finish: '2026-11-05',
            deps: [{ from: 'A' }],
          },
          { id: 'U', deps: [{ from: 'P' }] }, // no dates: no bar to point at
        ],
      }),
    ).toEqual([]);
  });

  it('flags a link broken by the dates', () => {
    const [arrow] = arrowsFor({
      tasks: [
        { id: 'A', name: 'Build', start: '2026-11-02', finish: '2026-11-06' },
        { id: 'B', name: 'Test', start: '2026-11-05', finish: '2026-11-10', deps: [{ from: 'A' }] },
      ],
    });
    expect(arrow!.broken).toBe(true);
    expect(arrow!.label).toBe('Build → Test\nStarts before the task blocking it has finished.');
  });

  it('also flags a link whose blocked task starts the same day the blocker ends', () => {
    const [arrow] = arrowsFor({
      tasks: [
        { id: 'A', start: '2026-11-02', finish: '2026-11-04' },
        { id: 'B', start: '2026-11-04', finish: '2026-11-05', deps: [{ from: 'A' }] },
      ],
    });
    expect(arrow!.broken).toBe(true);
  });
});
