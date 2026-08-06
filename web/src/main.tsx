import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { App } from './App.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    {/* Light = Voyager basemap, dark = CARTO Dark Matter. Follows the OS by
        default; the sidebar toggle overrides it (persisted by next-themes). */}
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>
);
