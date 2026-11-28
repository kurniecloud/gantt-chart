import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyFormatted } from './clipboard';

/** A stand-in for `document.execCommand('copy')` that fires `copy` with a recording clipboard. */
function fakeCopyCommand(onCopy?: () => void) {
  const data = new Map<string, string>();
  const command = vi.fn((name: string) => {
    if (name !== 'copy') return false;
    onCopy?.();
    const event = new Event('copy', { cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { setData: (type: string, value: string) => data.set(type, value) },
    });
    document.dispatchEvent(event);
    return true;
  });
  Object.defineProperty(document, 'execCommand', { value: command, configurable: true });
  return { command, data };
}

function element(text: string) {
  const el = document.createElement('div');
  el.textContent = text;
  document.body.append(el);
  return el;
}

afterEach(() => {
  Reflect.deleteProperty(document, 'execCommand');
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('copyFormatted', () => {
  it('writes both formats through the copy command, then restores the selection', async () => {
    const before = element('Selected before');
    const table = element('Table');
    document.getSelection()!.selectAllChildren(before);
    let selectedDuringCopy: Node | null = null;
    const { command, data } = fakeCopyCommand(() => {
      selectedDuringCopy = document.getSelection()!.anchorNode;
    });

    await expect(copyFormatted('<table></table>', 'a\tb', table)).resolves.toBe(true);
    expect(command).toHaveBeenCalledWith('copy');
    expect(data.get('text/html')).toBe('<table></table>');
    expect(data.get('text/plain')).toBe('a\tb');
    expect(selectedDuringCopy).toBe(table);
    expect(document.getSelection()!.toString()).toBe('Selected before');
  });

  it('falls back to the async clipboard when the copy command is refused', async () => {
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true });
    const write = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal(
      'ClipboardItem',
      class {
        items: Record<string, Blob>;
        constructor(items: Record<string, Blob>) {
          this.items = items;
        }
      },
    );

    await expect(copyFormatted('<b>x</b>', 'x', element('Table'))).resolves.toBe(true);
    const [[[item]]] = write.mock.calls as unknown as [[[{ items: Record<string, Blob> }]]];
    expect(Object.keys(item.items)).toEqual(['text/html', 'text/plain']);
    await expect(item.items['text/html']!.text()).resolves.toBe('<b>x</b>');
  });

  it('resolves false when the browser refuses both ways', async () => {
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true });
    vi.stubGlobal('navigator', {
      clipboard: { write: vi.fn(async () => Promise.reject(new Error('NotAllowed'))) },
    });
    vi.stubGlobal('ClipboardItem', class {});
    await expect(copyFormatted('<b>x</b>', 'x', element('Table'))).resolves.toBe(false);

    vi.stubGlobal('navigator', {});
    await expect(copyFormatted('<b>x</b>', 'x', element('Table'))).resolves.toBe(false);
  });
});
