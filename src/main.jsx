import React from 'react';
import { createRoot } from 'react-dom/client';
import App, { AdminRenderBoundary } from './App.jsx';
import './styles.css';
import './nav-highlights.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminRenderBoundary>
      <App />
    </AdminRenderBoundary>
  </React.StrictMode>,
);
