import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no layout engine, so scrollIntoView is undefined. The list's
// keyboard nav calls it to keep the focused card in view; stub it to a no-op
// (the real scroll is verified by eye).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
