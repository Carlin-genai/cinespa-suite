
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Basic runtime diagnostics to help detect duplicate React bundles
if (typeof React !== 'undefined') {
  console.log('[Boot] React version:', React.version);
} else {
  console.warn('[Boot] React is undefined at startup');
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('[Boot] Root element #root not found in index.html');
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
