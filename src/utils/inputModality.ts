export type InputModality = 'pointer' | 'keyboard';

/**
 * Keys that are only ever pressed as part of a shortcut, never to move around the page — plus
 * keys the browser can't identify ("" from some synthetic events, "Unidentified").
 */
const MODIFIER_KEYS = new Set([
  'Shift',
  'Meta',
  'Control',
  'Alt',
  'AltGraph',
  'CapsLock',
  'Fn',
  'Unidentified',
  '',
]);

/** True for key presses that mean the user is working with the keyboard (Tab, arrows, Space…). */
export function isNavigationKey(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>) {
  return !event.metaKey && !event.ctrlKey && !MODIFIER_KEYS.has(event.key);
}

/**
 * Chrome shows the keyboard focus ring (`:focus-visible`) on a clicked button as soon as any key
 * is pressed — even Shift or ⌘ on their own, as in a screenshot shortcut or ⌘Z. So that the ring
 * means "you're navigating by keyboard", record how the user last interacted, ignoring modifiers
 * and shortcuts, as `data-input="pointer" | "keyboard"` on `root`. `global.css` hides the ring on
 * controls while it's "pointer". Returns a function that stops tracking.
 */
export function trackInputModality(root: HTMLElement = document.documentElement): () => void {
  const set = (modality: InputModality) => {
    if (root.dataset.input !== modality) root.dataset.input = modality;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (isNavigationKey(event)) set('keyboard');
  };
  const onPointerDown = () => set('pointer');
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    delete root.dataset.input;
  };
}
