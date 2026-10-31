import { DiamondIcon } from '../../components/icons';
import { dayLabel, monthKey, monthLabel, weekLabel, type MilestoneMark } from './labels';
import { columnStartDate, monthColumns, type TimelineScale } from './scale';
import styles from './Timeline.module.css';

type TimelineHeaderProps = {
  scale: TimelineScale;
  /** Column indexes currently drawn (virtualized). */
  columns: number[];
  /** Column containing today (the day in daily view, the week in weekly view). */
  todayColumn: number | null;
  /** Today's own day slot, or null on a weekend. */
  todaySlot: { x: number; width: number } | null;
  milestones: MilestoneMark[];
};

/** Two rows: month + year, then one cell per day (daily) or per week (weekly). */
export function TimelineHeader({
  scale,
  columns,
  todayColumn,
  todaySlot,
  milestones,
}: TimelineHeaderProps) {
  const width = scale.columnWidth;
  const months = new Map<string, { date: string; first: number; last: number }>();
  for (const column of columns) {
    const date = columnStartDate(scale, column);
    const key = monthKey(date);
    if (!months.has(key)) months.set(key, { date, ...monthColumns(scale, date) });
  }

  return (
    <div className={styles.header}>
      <div className={styles.months} aria-hidden="true">
        {[...months].map(([key, month]) => (
          <div
            key={key}
            className={styles.month}
            style={{ left: month.first * width, width: (month.last - month.first + 1) * width }}
          >
            <span className={styles.monthLabel}>{monthLabel(month.date)}</span>
          </div>
        ))}
      </div>
      <div className={styles.columns}>
        {milestones.map((m) => (
          <div
            key={m.date}
            className={styles.milestoneSlot}
            style={{ left: m.x, width: m.width }}
          />
        ))}
        {todaySlot && (
          <div className={styles.todaySlot} style={{ left: todaySlot.x, width: todaySlot.width }} />
        )}
        {columns.map((column) => {
          const date = columnStartDate(scale, column);
          return (
            <div
              key={column}
              className={styles.column}
              aria-hidden="true"
              data-today={column === todayColumn || undefined}
              data-week-start={(scale.mode === 'daily' && column % 5 === 0) || undefined}
              style={{ left: column * width, width }}
            >
              {scale.mode === 'daily' ? dayLabel(date) : weekLabel(date)}
            </div>
          );
        })}
        {milestones.map((m) => (
          <span
            key={m.date}
            role="img"
            className={styles.milestoneMarker}
            aria-label={m.label}
            title={m.label}
            style={{ left: m.x + m.width / 2 }}
          >
            <DiamondIcon />
          </span>
        ))}
      </div>
    </div>
  );
}
