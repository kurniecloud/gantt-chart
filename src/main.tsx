import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadInitialProject, startAutosave } from './persistence/autosave';
import { useProjectStore } from './store/projectStore';
import './styles/global.css';

async function bootstrap() {
  const { project, persistent } = await loadInitialProject();
  useProjectStore.getState().loadProject(project);
  if (persistent) startAutosave();

  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');
  createRoot(root).render(
    <StrictMode>
      <App storageAvailable={persistent} />
    </StrictMode>,
  );
}

void bootstrap();
