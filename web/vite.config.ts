/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Dev-only: serve the seed `routes.geojson` at `/api/routes` so `npm run dev`
 * shows the pooled map. In production that path is the Cloudflare Function reading
 * D1; the Function + D1 only run under `wrangler pages dev` or on Pages, so without
 * this the dev server's `loadRoutes()` would 404 and show an empty map. Not part
 * of the production build (`apply: 'serve'`).
 */
function devRoutesApi(): Plugin {
  return {
    name: 'dev-routes-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/routes', (_req, res) => {
        const file = fileURLToPath(
          new URL('./public/routes.geojson', import.meta.url)
        );
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devRoutesApi()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Only Vitest owns *.test.*; Playwright's e2e/*.spec.ts run under their own
    // runner and must not be swept up here.
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
