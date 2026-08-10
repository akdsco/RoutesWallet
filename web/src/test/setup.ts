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

// next-themes reads the OS preference through matchMedia; jsdom has no such API,
// so stub a stable "light" media query. Individual tests drive the theme via the
// toggle rather than the OS, so a fixed default is all we need.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
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
