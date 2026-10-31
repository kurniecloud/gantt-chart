import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '../domain/project';
import { makeProject } from '../test/fixtures';
import {
  ProjectFileError,
  exportFileName,
  parseProjectFile,
  serializeProject,
} from './projectFile';

const sample = () =>
  makeProject({
    name: 'Website relaunch',
    description: 'Q4 marketing site',
    milestones: [{ name: 'Sign-off', date: '2026-11-13' }],
    tasks: [
      { id: 'P', name: 'Website', collapsed: true },
      {
        id: 'A',
        name: 'Design',
        parent: 'P',
        start: '2026-11-02',
        finish: '2026-11-06',
        priority: 'high',
      },
      { id: 'B', name: 'Build', start: '2026-11-09', deps: [{ from: 'A' }] },
    ],
  });

const envelope = (project: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: 'gantt-chart',
    schemaVersion: 3,
    exportedAt: '2026-11-01',
    project,
    ...extra,
  });

describe('export', () => {
  it('wraps the whole project in a versioned envelope', () => {
    const project = sample();
    const file = JSON.parse(serializeProject(project, '2026-11-01'));
    expect(file).toMatchObject({
      format: 'gantt-chart',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: '2026-11-01',
    });
    expect(file.project).toEqual(project);
  });

  it.each([
    ['Website relaunch', 'website-relaunch.gantt.json'],
    ['  Q4: Plan / Ops!  ', 'q4-plan-ops.gantt.json'],
    ['Café déjà vu', 'cafe-deja-vu.gantt.json'],
    ['!!!', 'project.gantt.json'],
  ])('names the file after the title: %s → %s', (name, fileName) => {
    expect(exportFileName({ name })).toBe(fileName);
  });
});

describe('import', () => {
  it('round-trips an exported project exactly', () => {
    const project = sample();
    expect(parseProjectFile(serializeProject(project, '2026-11-01'))).toEqual(project);
  });

  it('upgrades files saved by older versions', () => {
    const { milestones: _m, ...v2 } = sample();
    const project = parseProjectFile(envelope({ ...v2, schemaVersion: 2 }));
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(project.milestones).toEqual([]);
  });

  it('puts every task right before its subtasks', () => {
    const project = sample();
    project.taskOrder = ['A', 'P', 'B']; // subtask A listed before its parent P
    expect(parseProjectFile(envelope(project)).taskOrder).toEqual(['P', 'A', 'B']);
  });

  it.each([
    ['not json', '{oops', /isn't valid JSON/],
    ['another app’s file', JSON.stringify({ tasks: [] }), /isn't a Gantt Chart project file/],
    ['a newer version', envelope({ ...sample(), schemaVersion: 99 }), /newer version/],
    ['missing fields', envelope({ schemaVersion: 3, name: 'x' }), /invalid/],
  ])('rejects %s', (_label, text, message) => {
    expect(() => parseProjectFile(text)).toThrow(ProjectFileError);
    expect(() => parseProjectFile(text)).toThrow(message);
  });

  it.each([
    [
      'a bad date',
      (p: ReturnType<typeof sample>) => void (p.tasks.A!.start = '2026-13-01'),
      /“Design” has an invalid start date/,
    ],
    [
      'an unknown parent',
      (p: ReturnType<typeof sample>) => void (p.tasks.A!.parentId = 'ghost'),
      /unknown parent/,
    ],
    [
      'an unknown priority',
      (p: ReturnType<typeof sample>) => void Object.assign(p.tasks.A!, { priority: 'max' }),
      /unknown priority/,
    ],
    [
      'a parent loop',
      (p: ReturnType<typeof sample>) => void (p.tasks.P!.parentId = 'A'),
      /parent loop/,
    ],
    ['a broken task order', (p: ReturnType<typeof sample>) => void p.taskOrder.pop(), /task order/],
    [
      'a dangling dependency',
      (p: ReturnType<typeof sample>) =>
        void (Object.values(p.dependencies)[0]!.predecessorId = 'ghost'),
      /dependency/,
    ],
    [
      'a bad milestone',
      (p: ReturnType<typeof sample>) => void (p.milestones[0]!.date = 'soon'),
      /milestone/,
    ],
  ])('rejects %s with a readable reason', (_label, damage, message) => {
    const project = sample();
    damage(project);
    expect(() => parseProjectFile(envelope(project))).toThrow(message);
  });
});

describe('actual dates in files', () => {
  it('round-trips actual dates and rejects damaged ones', () => {
    const project = sample();
    project.tasks.A = {
      ...project.tasks.A!,
      actualStart: '2026-11-03',
      actualFinish: '2026-11-05',
    };
    expect(parseProjectFile(serializeProject(project, '2026-11-01')).tasks.A).toMatchObject({
      actualStart: '2026-11-03',
      actualFinish: '2026-11-05',
    });
    project.tasks.A.actualFinish = 'next week';
    expect(() => parseProjectFile(envelope(project))).toThrow(
      /“Design” has an invalid actual end date/,
    );
  });
});
