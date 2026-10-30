import { describe, expect, it } from 'vitest';
import { taskDepths } from './project';
import { createSampleProject } from './sampleProject';

describe('createSampleProject', () => {
  const project = createSampleProject('2026-11-02'); // Monday
  const byName = Object.fromEntries(Object.values(project.tasks).map((t) => [t.name, t]));

  it('chains leaf tasks finish-to-start across weekends', () => {
    expect(byName['Gather requirements']).toMatchObject({
      start: '2026-11-02',
      finish: '2026-11-04',
    });
    expect(byName['Write specification']).toMatchObject({
      start: '2026-11-05',
      finish: '2026-11-10',
    });
  });

  it('places a milestone on its predecessor’s finish day', () => {
    expect(byName['Specification approved']).toMatchObject({
      start: '2026-11-10',
      finish: '2026-11-10',
      durationDays: 0,
    });
    expect(byName['Design UI']).toMatchObject({ start: '2026-11-11', finish: '2026-11-17' });
  });

  it('rolls summary dates up from children', () => {
    expect(byName['Planning']).toMatchObject({
      start: '2026-11-02',
      finish: '2026-11-10',
      durationDays: 7,
    });
    expect(byName['Build']).toMatchObject({ start: '2026-11-11', finish: '2026-12-08' });
  });

  it('builds the hierarchy in pre-order', () => {
    const depths = project.taskOrder.map((id) => taskDepths(project).get(id));
    expect(depths).toEqual([0, 1, 1, 1, 0, 1, 1, 1, 0]);
  });

  it('links every consecutive leaf', () => {
    expect(Object.keys(project.dependencies)).toHaveLength(6);
  });
});
