import { Button } from '../../components/Button';
import { ActualDatesIcon, PathIcon } from '../../components/icons';
import { useViewStore, type ViewMode } from '../../store/viewStore';
import styles from './Timeline.module.css';

const MODES: { value: ViewMode; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

type TimelineToolbarProps = {
  onToday: () => void;
  /** Critical leaf tasks while the critical path is shown, otherwise null. */
  criticalCount: number | null;
};

export function TimelineToolbar({ onToday, criticalCount }: TimelineToolbarProps) {
  const mode = useViewStore((s) => s.mode);
  const setMode = useViewStore((s) => s.setMode);
  const showActualDates = useViewStore((s) => s.showActualDates);
  const toggleActualDates = useViewStore((s) => s.toggleActualDates);
  const showCriticalPath = useViewStore((s) => s.showCriticalPath);
  const toggleCriticalPath = useViewStore((s) => s.toggleCriticalPath);

  return (
    <div className={styles.toolbar}>
      <div className={styles.segmented} role="radiogroup" aria-label="Timeline View">
        {MODES.map(({ value, label }) => (
          <label key={value} className={styles.segment}>
            <input
              type="radio"
              name="timeline-view"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {label}
          </label>
        ))}
      </div>
      <Button onClick={onToday}>Today</Button>
      {/* Left of Critical Path, so its count stays beside it and nothing moves when it toggles. */}
      <Button
        className={showActualDates ? styles.actualOn : undefined}
        aria-pressed={showActualDates}
        title="Show or hide the blue lines for actual dates under the bars"
        onClick={toggleActualDates}
      >
        <ActualDatesIcon />
        Actual Dates
      </Button>
      <Button
        className={showCriticalPath ? styles.criticalOn : undefined}
        aria-pressed={showCriticalPath}
        title="Show the tasks that would delay the project's end if they slipped"
        onClick={toggleCriticalPath}
      >
        <PathIcon />
        Critical Path
      </Button>
      <span className={styles.status} role="status">
        {criticalCount === null
          ? ''
          : criticalCount === 0
            ? 'No Dated Tasks'
            : `${criticalCount} Critical Task${criticalCount === 1 ? '' : 's'}`}
      </span>
    </div>
  );
}
