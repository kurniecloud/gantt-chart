import { describe, expect, it } from 'vitest';
import { normalizeTaskInput, validateTaskInput } from './taskInput';

describe('validateTaskInput', () => {
  it.each([
    [{ name: 'Design' }, {}],
    [{ name: 'Design', start: '2026-11-02', finish: '2026-11-06' }, {}],
    [{ name: 'Design', start: '2026-11-02' }, {}], // start only is fine
    [{ name: 'Design', finish: '2026-11-06' }, {}], // end only is fine
    [{ name: 'Design', start: '2026-11-04', finish: '2026-11-04' }, {}], // one day
    [{ name: '   ' }, { name: 'Enter a task name' }],
    [{ name: 'Design', start: '2026-10-31' }, { start: 'Pick a weekday' }], // Sat
    [{ name: 'Design', finish: '2026-11-01' }, { finish: 'Pick a weekday' }], // Sun
    [{ name: 'Design', start: '2026-02-30' }, { start: 'Enter a valid date' }],
    [
      { name: 'Design', start: '2026-11-06', finish: '2026-11-02' },
      { finish: "End date can't be before the start date" },
    ],
  ])('%j → %j', (input, expected) => {
    expect(validateTaskInput(input)).toEqual(expected);
  });
});

describe('normalizeTaskInput', () => {
  it('trims the name and drops empty fields', () => {
    expect(normalizeTaskInput({ name: '  Design  ', start: '', priority: undefined })).toEqual({
      name: 'Design',
    });
    expect(
      normalizeTaskInput({
        name: 'Build',
        start: '2026-11-02',
        finish: '2026-11-03',
        priority: 'high',
      }),
    ).toEqual({ name: 'Build', start: '2026-11-02', finish: '2026-11-03', priority: 'high' });
  });
});
