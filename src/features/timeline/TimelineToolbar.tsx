import { Button } from '../../components/Button';
import { PathIcon } from '../../components/icons';
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
  const showCriticalPath = useViewStore((s) => s.showCriticalPath);
  const toggleCriticalPath = useViewStore((s) => s.toggleCriticalPath);

  return (
    <div className={styles.toolbar}>
      <div className={styles.segmented} role="radiogroup" aria-label="Timeline view">
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
      <Button
        className={showCriticalPath ? styles.criticalOn : undefined}
        aria-pressed={showCriticalPath}
        title="Show the tasks that would delay the project's end if they slipped"
        onClick={toggleCriticalPath}
      >
        <PathIcon />
        Critical path
      </Button>
      <span className={styles.status} role="status">
        {criticalCount === null
          ? ''
          : criticalCount === 0
            ? 'No dated tasks'
            : `${criticalCount} critical task${criticalCount === 1 ? '' : 's'}`}
      </span>
    </div>
  );
}
