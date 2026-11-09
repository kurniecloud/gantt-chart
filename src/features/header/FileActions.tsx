import { useRef } from 'react';
import { Button } from '../../components/Button';
import { DownloadIcon, NewFileIcon, UploadIcon } from '../../components/icons';
import { projectHasEntries } from '../../domain/project';
import { downloadProject } from '../../io/download';
import { MAX_FILE_BYTES, ProjectFileError, parseProjectFile } from '../../io/projectFile';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import styles from './ProjectHeader.module.css';

/** New (empty the project), Import (replace it from a .gantt.json file) and Export (download it). */
export function FileActions() {
  const openDialog = useUiStore((s) => s.openDialog);
  const inputRef = useRef<HTMLInputElement>(null);

  const startNewProject = () => {
    if (projectHasEntries(useProjectStore.getState().project)) {
      openDialog({ kind: 'new-project-export' });
    }
  };

  const readFile = async (file: File) => {
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new ProjectFileError('The file is too large (over 20 MB).');
      }
      const project = parseProjectFile(await file.text());
      openDialog({ kind: 'import-confirm', fileName: file.name, project });
    } catch (error) {
      const message =
        error instanceof ProjectFileError ? error.message : 'The file could not be read.';
      openDialog({ kind: 'import-error', fileName: file.name, message });
    }
  };

  return (
    <div className={styles.fileActions}>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className={styles.fileInput}
        aria-label="Project File to Import"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ''; // so choosing the same file again still triggers a change
          if (file) void readFile(file);
        }}
      />
      <Button title="Clear this project and start a new one" onClick={startNewProject}>
        <NewFileIcon />
        New
      </Button>
      <Button
        title="Replace this project with one from a .gantt.json file"
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon />
        Import
      </Button>
      <Button
        title="Download this project as a .gantt.json file"
        onClick={() => downloadProject(useProjectStore.getState().project)}
      >
        <DownloadIcon />
        Export
      </Button>
    </div>
  );
}
