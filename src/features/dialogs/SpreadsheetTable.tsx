import type { ProjectSheet, SheetCell, SheetRow } from '../../io/spreadsheet';
import { MILESTONE_COLUMNS, TASK_COLUMNS } from '../../io/spreadsheet';
import { formatDate } from '../../utils/formatDate';
import styles from './SpreadsheetTable.module.css';

/** Dates read as they will in the spreadsheet ("2 Nov 2026"). */
const DATE_PATTERN = 'd MMM yyyy';

function Cell({ cell, wide }: { cell: SheetCell; wide: boolean }) {
  if (cell.type === 'date') {
    return (
      <td className={styles.date}>{cell.value ? formatDate(cell.value, DATE_PATTERN) : ''}</td>
    );
  }
  return (
    <td
      className={wide ? styles.wide : undefined}
      style={
        cell.indent
          ? { paddingLeft: `calc(var(--space-2) + ${cell.indent} * var(--indent-per-level))` }
          : undefined
      }
    >
      {cell.value}
    </td>
  );
}

type SheetTableProps = {
  label: string;
  columns: readonly string[];
  rows: SheetRow[];
  /** The column whose text wraps (Remarks); the others stay on one line. */
  wideColumn?: number;
};

function SheetTable({ label, columns, rows, wideColumn }: SheetTableProps) {
  return (
    <table className={styles.table} aria-label={label}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={row.bold ? styles.bold : undefined}>
            {row.cells.map((cell, i) => (
              <Cell key={i} cell={cell} wide={i === wideColumn} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type SpreadsheetTableProps = {
  sheet: ProjectSheet;
};

/** What Copy Table puts on the clipboard, drawn as it will land in the spreadsheet. */
export function SpreadsheetTable({ sheet }: SpreadsheetTableProps) {
  return (
    <>
      <p className={styles.title}>{sheet.title}</p>
      {sheet.description && <p className={styles.description}>{sheet.description}</p>}
      <SheetTable
        label="Tasks"
        columns={TASK_COLUMNS}
        rows={sheet.tasks}
        wideColumn={TASK_COLUMNS.indexOf('Remarks')}
      />
      <SheetTable label="Milestones" columns={MILESTONE_COLUMNS} rows={sheet.milestones} />
    </>
  );
}
