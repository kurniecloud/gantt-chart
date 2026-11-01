import type { ProjectSummary } from '../../domain/summary';
import { lengthLabel, lengthTitle, taskCountTitle } from './summaryLabels';
import styles from './Workspace.module.css';

type ProjectTotalsProps = {
  summary: ProjectSummary;
};

/** "4 tasks · Planned 45D · Actual 30D" above "Task name"; tooltips give the dates. */
export function ProjectTotals({ summary }: ProjectTotalsProps) {
  const { taskCount, planned, actual, inProgress } = summary;
  // The spaces around the separators don't show (flex layout) but keep words apart for screen
  // readers.
  return (
    <p className={styles.totals} data-testid="project-totals">
      <span className={styles.total} title={taskCountTitle(summary)}>
        <strong>{taskCount}</strong> {taskCount === 1 ? 'task' : 'tasks'}
      </span>{' '}
      <span className={styles.separator} aria-hidden="true">
        ·
      </span>{' '}
      <span className={styles.total} title={lengthTitle('Planned', planned)}>
        {/* Phones show "Plan"; screen readers always get "Planned". */}
        <span className={styles.longLabel}>Planned</span>
        <span className={styles.shortLabel} aria-hidden="true">
          Plan
        </span>{' '}
        <strong>{lengthLabel(planned)}</strong>
      </span>{' '}
      <span className={styles.separator} aria-hidden="true">
        ·
      </span>{' '}
      <span className={styles.total} title={lengthTitle('Actual', actual, inProgress)}>
        <span className={styles.actualSample} aria-hidden="true" />
        Actual <strong className={styles.actualFigure}>{lengthLabel(actual)}</strong>
      </span>
    </p>
  );
}
