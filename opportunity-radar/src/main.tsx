import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AppStateProvider } from './state/AppState';

// Production uses real paths (/dashboard) and needs an SPA rewrite on the host.
// Demo builds (`npm run build:demo`) are a single self-contained HTML file with
// no server behind them, so they fall back to hash routing (#/dashboard).
const Router = import.meta.env.VITE_DEMO_HASH_ROUTER ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </Router>
  </StrictMode>,
);
