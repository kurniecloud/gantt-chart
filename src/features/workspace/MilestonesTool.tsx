import { useMemo } from 'react';
import { Button } from '../../components/Button';
import { FlagIcon } from '../../components/icons';
import { milestoneSummary } from '../../domain/summary';
import type { ISODate } from '../../domain/types';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { milestoneSummaryLabel, milestoneSummaryTitle } from './summaryLabels';
import styles from './Workspace.module.css';

type MilestonesToolProps = {
  today: ISODate;
};

/** The Milestones button and "5 Milestones · 3 Upcoming" beside it. */
export function MilestonesTool({ today }: MilestonesToolProps) {
  const milestones = useProjectStore((s) => s.project.milestones);
  const openDialog = useUiStore((s) => s.openDialog);
  const summary = useMemo(() => milestoneSummary(milestones, today), [milestones, today]);

  return (
    <>
      <Button onClick={() => openDialog({ kind: 'milestones' })}>
        <FlagIcon />
        Milestones
      </Button>
      <span
        className={styles.milestoneSummary}
        title={milestoneSummaryTitle(summary)}
        data-testid="milestone-summary"
      >
        {milestoneSummaryLabel(summary)}
      </span>
    </>
  );
}
