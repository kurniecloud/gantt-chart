/**
 * Puts a formatted (HTML) and a plain-text version of the same content on the clipboard. Call it
 * from a click: browsers allow clipboard writes only during a user gesture. `selectable` is an
 * element inside the open dialog, selected for a moment because some browsers fire `copy` only
 * when something is selected (and content outside a modal dialog can't be). Resolves to false
 * when the browser refuses.
 */
export async function copyFormatted(
  html: string,
  text: string,
  selectable: HTMLElement,
): Promise<boolean> {
  if (copyWithCommand(html, text, selectable)) return true;
  // The async API needs a clipboard permission that some browsers and embedded views refuse, and
  // it rewrites the HTML (wrapping it in a new document), so it's only the fallback.
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

function copyWithCommand(html: string, text: string, selectable: HTMLElement): boolean {
  if (typeof document.execCommand !== 'function') return false;
  let written = false;
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    event.clipboardData.setData('text/html', html);
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
    written = true;
  };
  const selection = document.getSelection();
  const saved = selection
    ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i))
    : [];
  document.addEventListener('copy', onCopy, true);
  try {
    selection?.selectAllChildren(selectable);
    // Deprecated, but it needs no permission and writes the HTML exactly as given.
    return document.execCommand('copy') && written;
  } catch {
    return false;
  } finally {
    document.removeEventListener('copy', onCopy, true);
    selection?.removeAllRanges();
    for (const range of saved) selection?.addRange(range);
  }
}
