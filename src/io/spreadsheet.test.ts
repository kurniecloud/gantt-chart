import { describe, expect, it } from 'vitest';
import { makeProject } from '../test/fixtures';
import { projectSheet, sheetHtml, sheetText, TASK_COLUMNS } from './spreadsheet';

const project = () =>
  makeProject({
    name: 'Website',
    description: 'Relaunch',
    tasks: [
      { id: 'P', name: 'Build', priority: 'urgent' },
      {
        id: 'A',
        name: 'Design UI',
        parent: 'P',
        start: '2026-11-02',
        finish: '2026-11-06',
        actualStart: '2026-11-03',
        owner: 'Ana',
        priority: 'high',
        notes: 'First line\nSecond line',
      },
      { id: 'B', name: 'Test', start: '2026-11-09', deps: [{ from: 'A' }] },
    ],
    milestones: [{ id: 'M', name: 'Sign-off', date: '2026-11-13' }],
  });

/** The `<td>`s of the `n`th `<tr>` (0-based) of a copied table, parsed by the browser. */
function cellsOf(html: string, n: number) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('tr')[n]!.querySelectorAll('td')];
}

describe('projectSheet', () => {
  it('turns every task into the twelve columns, in task-list order', () => {
    const sheet = projectSheet(project());
    expect(sheet.title).toBe('Website');
    expect(sheet.description).toBe('Relaunch');
    expect(sheet.tasks.map((row) => row.cells.map((cell) => cell.value))).toEqual([
      [
        '1',
        'Build',
        '2026-11-02',
        '2026-11-06',
        '2026-11-03',
        undefined,
        'In Progress',
        '',
        '',
        '',
        'Urgent',
        '',
      ],
      [
        '1.1',
        'Design UI',
        '2026-11-02',
        '2026-11-06',
        '2026-11-03',
        undefined,
        'In Progress',
        'Ana',
        '',
        '2',
        'High',
        'First line\nSecond line',
      ],
      [
        '2',
        'Test',
        '2026-11-09',
        undefined,
        undefined,
        undefined,
        'Not Started',
        '',
        '1.1',
        '',
        'None',
        '',
      ],
    ]);
    expect(sheet.tasks.map((row) => row.bold)).toEqual([true, false, false]);
    expect(sheet.tasks[1]!.cells[1]).toEqual({ type: 'text', value: 'Design UI', indent: 1 });
    expect(sheet.milestones.map((row) => row.cells.map((cell) => cell.value))).toEqual([
      ['Sign-off', '2026-11-13'],
    ]);
  });
});

describe('sheetHtml', () => {
  it('lays out title, description, tasks and milestones as rows of one table', () => {
    const html = sheetHtml(projectSheet(project()));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = [...doc.querySelectorAll('tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent),
    );
    expect(rows[0]).toEqual(['Website']);
    expect(rows[1]).toEqual(['Relaunch']);
    expect(rows[2]).toEqual(['']);
    expect(rows[3]).toEqual([...TASK_COLUMNS]);
    expect(rows[4]![0]).toBe('1');
    expect(rows[6]![1]).toBe('Test');
    expect(rows[7]).toEqual(['']);
    expect(rows[8]).toEqual(['Milestone Name', 'Date']);
    expect(rows[9]).toEqual(['Sign-off', '2026-11-13']);
    expect(rows).toHaveLength(10);
    expect(html.startsWith('<meta charset="utf-8">')).toBe(true);
  });

  it('leaves out the description row when there is none', () => {
    const sheet = { ...projectSheet(project()), description: '' };
    expect(cellsOf(sheetHtml(sheet), 1).map((td) => td.textContent)).toEqual(['']);
  });

  it('marks text cells as text and date cells as dates', () => {
    const [id, name, plannedStart, , , actualEnd] = cellsOf(sheetHtml(projectSheet(project())), 5);
    expect(id!.getAttribute('style')).toContain(`mso-number-format:'\\@'`);
    expect(name!.getAttribute('style')).toContain(`mso-number-format:'\\@'`);
    expect(plannedStart!.getAttribute('style')).toContain(`mso-number-format:'d mmm yyyy'`);
    expect(plannedStart!.textContent).toBe('2026-11-02');
    expect(actualEnd!.textContent).toBe('');
  });

  it('indents names by level and bolds parents and headers', () => {
    const html = sheetHtml(projectSheet(project()));
    expect(cellsOf(html, 3)[0]!.getAttribute('style')).toContain('font-weight:700');
    expect(cellsOf(html, 4)[1]!.getAttribute('style')).toContain('font-weight:700');
    const child = cellsOf(html, 5)[1]!.getAttribute('style')!;
    expect(child).not.toContain('font-weight');
    expect(child).toContain('mso-char-indent-count:1');
    expect(cellsOf(html, 4)[1]!.getAttribute('style')).not.toContain('indent');
  });

  it('keeps line breaks inside the cell and spaces HTML would lose', () => {
    const sheet = projectSheet(
      makeProject({ tasks: [{ id: 'A', name: '  Two  spaces ', notes: 'One\r\nTwo\nThree' }] }),
    );
    const html = sheetHtml(sheet);
    expect(html).toContain(
      'One<br style="mso-data-placement:same-cell">Two<br style="mso-data-placement:same-cell">Three',
    );
    expect(html).toContain(
      '<span style="mso-spacerun:yes">  </span>Two<span style="mso-spacerun:yes">  </span>spaces<span style="mso-spacerun:yes"> </span>',
    );
  });

  it('escapes user text so it can never become markup', () => {
    const sheet = projectSheet(
      makeProject({
        name: '<img src=x onerror=alert(1)>',
        tasks: [{ id: 'A', name: 'A & B "quoted" <b>', owner: "O'Neil" }],
      }),
    );
    const html = sheetHtml(sheet);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(cellsOf(html, 0)[0]!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(cellsOf(html, 3)[1]!.textContent).toBe('A & B "quoted" <b>');
    expect(cellsOf(html, 3)[7]!.textContent).toBe("O'Neil");
  });
});

describe('sheetText', () => {
  it('is tab-separated, with dates as YYYY-MM-DD and quoted multi-line cells', () => {
    const lines = sheetText(projectSheet(project())).split('\n');
    expect(lines[0]).toBe('Website');
    expect(lines[1]).toBe('Relaunch');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe(TASK_COLUMNS.join('\t'));
    expect(lines[4]).toBe(
      '1\tBuild\t2026-11-02\t2026-11-06\t2026-11-03\t\tIn Progress\t\t\t\tUrgent\t',
    );
    expect(lines[5]).toBe(
      '1.1\tDesign UI\t2026-11-02\t2026-11-06\t2026-11-03\t\tIn Progress\tAna\t\t2\tHigh\t"First line',
    );
    expect(lines[6]).toBe('Second line"');
    expect(lines.slice(-2)).toEqual(['Milestone Name\tDate', 'Sign-off\t2026-11-13']);
  });

  it('doubles quotes inside a quoted cell', () => {
    const text = sheetText(
      projectSheet(makeProject({ tasks: [{ id: 'A', name: 'Say "hi"\tnow' }] })),
    );
    expect(text).toContain('\t"Say ""hi""\tnow"\t');
  });
});
