import { useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z and Ctrl+Y redo — except while typing in a field or while
 * a dialog is open (undoing behind a modal would change things the user can't see).
 */
export function useUndoRedoShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextEntry(e.target)) return;
      if (document.querySelector('dialog[open]')) return;
      const key = e.key.toLowerCase();
      const { undo, redo } = useProjectStore.getState();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || (key === 'y' && e.ctrlKey && !e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
