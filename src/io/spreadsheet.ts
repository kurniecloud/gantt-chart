import type { TaskStatus } from '../domain/taskTable';
import { taskTable } from '../domain/taskTable';
import type { ISODate, Project } from '../domain/types';
import { PRIORITY_LABELS } from '../utils/priority';

// The project as rows and cells for a spreadsheet: one model, drawn as the JSON Editor's table
// view and copied as both a formatted table and tab-separated text.

export const TASK_COLUMNS = [
  'Task Id',
  'Task Name',
  'Planned Start Date',
  'Planned End Date',
  'Actual Start Date',
  'Actual End Date',
  'Status',
  'Owner',
  'Is Blocked By',
  'Is Blocking',
  'Priority',
  'Remarks',
] as const;

export const MILESTONE_COLUMNS = ['Milestone Name', 'Date'] as const;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  completed: 'Completed',
};

export type SheetCell =
  | { type: 'text'; value: string; /** Indent steps (Task Name only). */ indent?: number }
  | { type: 'date'; value: ISODate | undefined };

export type SheetRow = { key: string; cells: SheetCell[]; bold: boolean };

export type ProjectSheet = {
  title: string;
  description: string;
  tasks: SheetRow[];
  milestones: SheetRow[];
};

const text = (value: string, indent?: number): SheetCell =>
  indent ? { type: 'text', value, indent } : { type: 'text', value };
const date = (value: ISODate | undefined): SheetCell => ({ type: 'date', value });

export function projectSheet(project: Project): ProjectSheet {
  return {
    title: project.name,
    description: project.description,
    tasks: taskTable(project).map((row) => ({
      key: row.id,
      bold: row.hasSubtasks,
      cells: [
        text(row.number),
        text(row.name, row.depth),
        date(row.plannedStart),
        date(row.plannedEnd),
        date(row.actualStart),
        date(row.actualEnd),
        text(STATUS_LABELS[row.status]),
        text(row.owner),
        text(row.blockedBy.join(', ')),
        text(row.blocking.join(', ')),
        text(row.priority ? PRIORITY_LABELS[row.priority] : 'None'),
        text(row.remarks),
      ],
    })),
    milestones: project.milestones.map((milestone) => ({
      key: milestone.id,
      bold: false,
      cells: [text(milestone.name), date(milestone.date)],
    })),
  };
}

// --- Formatted table (text/html) -------------------------------------------------------------
// Spreadsheet apps read these `mso-*` style properties from pasted HTML: text cells stay text
// (no "1.10" → 1.1, no dates or formulas made from names), dates become real dates in the given
// format, indents become cell indents, and line breaks stay inside their cell.

const TEXT_FORMAT = `mso-number-format:'\\@'`;
const DATE_FORMAT = `mso-number-format:'d mmm yyyy'`;
const CELL = 'vertical-align:top;border:.5pt solid #bfbfbf';
const BOLD = 'font-weight:700';
const HEADER = `${BOLD};background:#f2f2f2`;
const LINE_BREAK = `<br style="mso-data-placement:same-cell">`;
/** Spaces that HTML would collapse or trim: kept with the spreadsheet's own marker. */
const KEPT_SPACES = /[ \t]{2,}|^[ \t]+|[ \t]+$|\t/gm;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlText(value: string): string {
  return escapeHtml(value)
    .replace(KEPT_SPACES, (spaces) => `<span style="mso-spacerun:yes">${spaces}</span>`)
    .replace(/\r\n|\r|\n/g, LINE_BREAK);
}

function htmlCell(cell: SheetCell, style: string): string {
  if (cell.type === 'date') {
    return `<td style="${style};${DATE_FORMAT}">${escapeHtml(cell.value ?? '')}</td>`;
  }
  const indent = cell.indent
    ? `;padding-left:${cell.indent * 12}px;mso-char-indent-count:${cell.indent}`
    : '';
  return `<td style="${style};${TEXT_FORMAT}${indent}">${htmlText(cell.value)}</td>`;
}

function htmlRow(cells: SheetCell[], style: string): string {
  return `<tr>${cells.map((cell) => htmlCell(cell, style)).join('')}</tr>`;
}

const BLANK_ROW = '<tr><td></td></tr>';

/** The sheet as one HTML table, ready for the clipboard's text/html. */
export function sheetHtml(sheet: ProjectSheet): string {
  const header = (names: readonly string[]) =>
    htmlRow(
      names.map((name) => text(name)),
      `${CELL};${HEADER}`,
    );
  const body = (rows: SheetRow[]) =>
    rows.map((row) => htmlRow(row.cells, row.bold ? `${CELL};${BOLD}` : CELL)).join('');

  const rows = [
    htmlRow([text(sheet.title)], `${BOLD};font-size:14pt`),
    sheet.description ? htmlRow([text(sheet.description)], 'vertical-align:top') : '',
    BLANK_ROW,
    header(TASK_COLUMNS),
    body(sheet.tasks),
    BLANK_ROW,
    header(MILESTONE_COLUMNS),
    body(sheet.milestones),
  ];
  return `<meta charset="utf-8"><table>${rows.join('')}</table>`;
}

// --- Tab-separated text (text/plain) ---------------------------------------------------------

function tsvField(value: string): string {
  return /[\t\r\n"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function tsvRow(values: readonly string[]): string {
  return values.map(tsvField).join('\t');
}

const cellText = (cell: SheetCell) => cell.value ?? '';

/** The sheet as tab-separated text (dates as YYYY-MM-DD), for the clipboard's text/plain. */
export function sheetText(sheet: ProjectSheet): string {
  const lines = [
    tsvRow([sheet.title]),
    ...(sheet.description ? [tsvRow([sheet.description])] : []),
    '',
    tsvRow(TASK_COLUMNS),
    ...sheet.tasks.map((row) => tsvRow(row.cells.map(cellText))),
    '',
    tsvRow(MILESTONE_COLUMNS),
    ...sheet.milestones.map((row) => tsvRow(row.cells.map(cellText))),
  ];
  return lines.join('\n');
}
