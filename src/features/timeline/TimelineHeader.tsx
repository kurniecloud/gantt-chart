import { dayLabel, monthKey, monthLabel, weekLabel } from './labels';
import { columnStartDate, type TimelineScale } from './scale';
import styles from './Timeline.module.css';

type TimelineHeaderProps = {
  scale: TimelineScale;
  /** Column indexes currently drawn (virtualized). */
  columns: number[];
  todayColumn: number | null;
};

/** Two rows: month + year, then one cell per day (daily) or per week (weekly). */
export function TimelineHeader({ scale, columns, todayColumn }: TimelineHeaderProps) {
  const width = scale.columnWidth;
  const months: { key: string; date: string; first: number; last: number }[] = [];
  for (const column of columns) {
    const date = columnStartDate(scale, column);
    const key = monthKey(date);
    const current = months.at(-1);
    if (current?.key === key) current.last = column;
    else months.push({ key, date, first: column, last: column });
  }

  return (
    <div className={styles.header} aria-hidden="true">
      <div className={styles.months}>
        {months.map((month) => (
          <div
            key={month.key}
            className={styles.month}
            style={{ left: month.first * width, width: (month.last - month.first + 1) * width }}
          >
            <span className={styles.monthLabel}>{monthLabel(month.date)}</span>
          </div>
        ))}
      </div>
      <div className={styles.columns}>
        {columns.map((column) => {
          const date = columnStartDate(scale, column);
          return (
            <div
              key={column}
              className={styles.column}
              data-today={column === todayColumn || undefined}
              data-week-start={(scale.mode === 'daily' && column % 5 === 0) || undefined}
              style={{ left: column * width, width }}
            >
              {scale.mode === 'daily' ? dayLabel(date) : weekLabel(date)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
