import { todayISO } from '../domain/dates';
import type { Project } from '../domain/types';
import { exportFileName, serializeProject } from './projectFile';

/** Saves text as a file through the browser's normal download flow. */
export function downloadTextFile(fileName: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the data.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Downloads the project as its .gantt.json file. */
export function downloadProject(project: Project) {
  downloadTextFile(exportFileName(project), serializeProject(project, todayISO()));
}
