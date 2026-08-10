/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Only Vitest owns *.test.*; Playwright's e2e/*.spec.ts run under their own
    // runner and must not be swept up here.
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
