import { memo } from 'react';
import type { DependencyArrow } from './arrows';
import styles from './Timeline.module.css';

type DependencyArrowsProps = {
  arrows: DependencyArrow[];
  /** First and last row index currently drawn; arrows touching that range are rendered. */
  firstRow: number;
  lastRow: number;
  rowHeight: number;
};

const PAD = 12;

/**
 * Blocking links as arrows, in one SVG sized to just the arrows on screen (the timeline is
 * ~250,000 px wide). Sits under the bars; each arrow has a wider invisible stroke for its tooltip.
 */
export const DependencyArrows = memo(function DependencyArrows({
  arrows,
  firstRow,
  lastRow,
  rowHeight,
}: DependencyArrowsProps) {
  const shown = arrows.filter(
    (a) => Math.min(a.fromRow, a.toRow) <= lastRow && Math.max(a.fromRow, a.toRow) >= firstRow,
  );
  if (shown.length === 0) return null;

  const left = Math.min(...shown.map((a) => a.minX)) - PAD;
  const right = Math.max(...shown.map((a) => a.maxX)) + PAD;
  const top = Math.min(...shown.map((a) => Math.min(a.fromRow, a.toRow))) * rowHeight;
  const bottom = (Math.max(...shown.map((a) => Math.max(a.fromRow, a.toRow))) + 1) * rowHeight;

  return (
    <svg
      className={styles.arrows}
      aria-hidden="true"
      style={{ left, top, width: right - left, height: bottom - top }}
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
    >
      <defs>
        <marker
          id="dependency-arrow-head"
          viewBox="0 0 6 6"
          refX="6"
          refY="3"
          markerUnits="userSpaceOnUse"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0L6 3L0 6z" className={styles.arrowHead} />
        </marker>
        <marker
          id="dependency-arrow-head-broken"
          viewBox="0 0 6 6"
          refX="6"
          refY="3"
          markerUnits="userSpaceOnUse"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0L6 3L0 6z" className={styles.arrowHeadBroken} />
        </marker>
      </defs>
      {shown.map((arrow) => (
        <g
          key={arrow.key}
          data-testid="dependency-arrow"
          data-broken={arrow.broken || undefined}
          data-label={arrow.label}
        >
          <title>{arrow.label}</title>
          <path
            d={arrow.path}
            className={arrow.broken ? styles.arrowBroken : styles.arrow}
            markerEnd={`url(#dependency-arrow-head${arrow.broken ? '-broken' : ''})`}
          />
          <path d={arrow.path} className={styles.arrowHit} />
        </g>
      ))}
    </svg>
  );
});
