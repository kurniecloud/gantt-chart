import { useMemo } from 'react';
import { taskDepths } from '../../domain/project';
import { useProjectStore } from '../../store/projectStore';
import { formatDate, formatDuration } from '../../utils/formatDate';
import styles from './TaskGrid.module.css';

const INDENT_PX = 16;

export function TaskGrid() {
  const project = useProjectStore((s) => s.project);

  const rows = useMemo(() => {
    const depths = taskDepths(project);
    const parents = new Set(Object.values(project.tasks).map((t) => t.parentId));
    return project.taskOrder.flatMap((id, index) => {
      const task = project.tasks[id];
      if (!task) return [];
      return [
        { task, rowNumber: index + 1, depth: depths.get(id) ?? 0, isSummary: parents.has(id) },
      ];
    });
  }, [project]);

  if (rows.length === 0) {
    return <p className={styles.empty}>No tasks yet. Use “Add task” to create one.</p>;
  }

  return (
    <table className={styles.grid}>
      <thead>
        <tr>
          <th scope="col" className={styles.rowNumber}>
            #
          </th>
          <th scope="col">Task name</th>
          <th scope="col">Start</th>
          <th scope="col">Finish</th>
          <th scope="col" className={styles.numeric}>
            Duration
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ task, rowNumber, depth, isSummary }) => (
          <tr key={task.id} className={isSummary ? styles.summary : undefined}>
            <td className={styles.rowNumber}>{rowNumber}</td>
            <th
              scope="row"
              style={{ paddingLeft: `calc(var(--space-2) + ${depth * INDENT_PX}px)` }}
            >
              {task.name}
            </th>
            <td>{formatDate(task.start, 'EEE d MMM')}</td>
            <td>{formatDate(task.finish, 'EEE d MMM')}</td>
            <td className={styles.numeric}>
              {task.durationDays === 0 && !isSummary
                ? 'Milestone'
                : formatDuration(task.durationDays)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
