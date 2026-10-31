import { Button } from '../../components/Button';
import { useViewStore, type ViewMode } from '../../store/viewStore';
import styles from './Timeline.module.css';

const MODES: { value: ViewMode; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

type TimelineToolbarProps = {
  onToday: () => void;
};

export function TimelineToolbar({ onToday }: TimelineToolbarProps) {
  const mode = useViewStore((s) => s.mode);
  const setMode = useViewStore((s) => s.setMode);

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
    </div>
  );
}
