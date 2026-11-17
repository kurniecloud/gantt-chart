import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { ownerNames } from './owners';

describe('ownerNames', () => {
  it('lists each owner once, alphabetically, ignoring case when sorting', () => {
    const project = makeProject({
      tasks: [
        { id: 'A', owner: 'ben' },
        { id: 'B', owner: 'Ana' },
        { id: 'C' },
        { id: 'D', owner: 'ben' },
        { id: 'E', owner: 'Carla' },
      ],
    });
    expect(ownerNames(project)).toEqual(['Ana', 'ben', 'Carla']);
  });

  it('is empty when no task has an owner', () => {
    expect(ownerNames(makeProject({ tasks: [{ id: 'A' }] }))).toEqual([]);
  });
});
