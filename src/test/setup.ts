import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has <dialog> but not its modal API. Mimic the browser closely enough for tests:
// showModal() opens it, Esc fires a cancelable `cancel` event, close() fires `close`.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
    this.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !this.open) return;
      const cancel = new Event('cancel', { cancelable: true });
      if (this.dispatchEvent(cancel)) this.close();
    });
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom does no layout. Give every element a desktop-sized box so virtualized lists render
// their rows, and make scrollTo() move instantly and fire `scroll` like a browser does.
Object.defineProperties(HTMLElement.prototype, {
  clientWidth: { configurable: true, get: () => 1024 },
  clientHeight: { configurable: true, get: () => 768 },
});
Element.prototype.scrollTo = function scrollTo(this: Element, options?: ScrollToOptions | number) {
  if (typeof options !== 'object') return;
  if (options.left !== undefined) this.scrollLeft = options.left;
  if (options.top !== undefined) this.scrollTop = options.top;
  this.dispatchEvent(new Event('scroll'));
} as Element['scrollTo'];

afterEach(() => {
  cleanup();
});
