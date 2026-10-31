import { useEffect } from 'react';
import { useViewStore } from '../../store/viewStore';
import styles from './BusyOverlay.module.css';

/**
 * Blocks the page while the critical path is being recalculated: a transparent layer catches
 * clicks immediately, and keys are swallowed. The "Recalculating…" message fades in only after
 * 0.2 s, so quick recalculations (the usual case) don't flash.
 */
export function BusyOverlay() {
  const busy = useViewStore((s) => s.recalculating);

  useEffect(() => {
    if (!busy) return;
    const swallow = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', swallow, true);
    return () => window.removeEventListener('keydown', swallow, true);
  }, [busy]);

  if (!busy) return null;
  return (
    <div className={styles.overlay} data-testid="busy-overlay" aria-busy="true">
      <div className={styles.panel} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        Recalculating critical path…
      </div>
    </div>
  );
}
