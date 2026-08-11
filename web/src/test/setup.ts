// Integration-test setup, loaded by Vitest before each test file (see
// vite.config.ts `setupFiles`). Adds jest-dom matchers and the couple of
// browser APIs jsdom omits that our providers rely on.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no layout engine, so scrollIntoView is undefined. The list's
// keyboard nav calls it to keep the focused card in view; stub it to a no-op
// (the real scroll is verified by eye).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no matchMedia. Two consumers rely on it: next-themes reads
// `(prefers-color-scheme: dark)` — keep that false (light default; tests drive the
// theme via the toggle), and the responsive layout reads `(min-width: …)` — answer
// those true so integration tests exercise the DESKTOP layout by default. The
// mobile bottom-sheet layout is covered by its own unit tests + E2E / by eye.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Unmount and clear the DOM between tests so each starts from a clean slate.
afterEach(() => {
  cleanup();
});
