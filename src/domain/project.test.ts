import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { projectHasEntries } from './project';

describe('projectHasEntries', () => {
  it('is false for a project with only a title and description', () => {
    expect(projectHasEntries(makeProject({ name: 'Plan', description: 'Notes' }))).toBe(false);
  });

  it('is true with a task', () => {
    expect(projectHasEntries(makeProject({ tasks: [{ id: 'A', name: 'A' }] }))).toBe(true);
  });

  it('is true with only a milestone', () => {
    const project = makeProject({ milestones: [{ name: 'Sign-off', date: '2026-11-02' }] });
    expect(projectHasEntries(project)).toBe(true);
  });
});
