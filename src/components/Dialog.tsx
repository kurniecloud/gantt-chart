import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

type DialogProps = {
  title: string;
  /** Called when the dialog should go away (Esc, or the browser closing it). */
  onClose: () => void;
  /** Overrides what Esc does, e.g. closing an open date picker first. */
  onEscape?: () => void;
  /** `wide` for dialogs holding a table. */
  size?: 'default' | 'wide';
  children: ReactNode;
};

/**
 * A modal built on the native `<dialog>`: the browser traps focus, makes the page behind inert and
 * restores focus when it closes. Render it only while it should be open. Mark the element that
 * should receive focus with `data-autofocus` (React's `autoFocus` fires before the dialog opens).
 */
export function Dialog({ title, onClose, onEscape, size = 'default', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={size === 'wide' ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        (onEscape ?? onClose)();
      }}
      onClose={() => {
        // `close` fires asynchronously; ignore it if the dialog was reopened meanwhile (React
        // StrictMode unmounts and remounts effects once in development).
        if (!ref.current?.open) onClose();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
