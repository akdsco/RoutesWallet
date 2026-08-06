import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { App } from './App.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    {/* Light only for the prototype — Voyager has no dark basemap yet. The dark
        tokens stay in the CSS so re-enabling dark later is a one-line change. */}
    <ThemeProvider attribute="data-theme" forcedTheme="light">
      <App />
    </ThemeProvider>
  </StrictMode>
);
