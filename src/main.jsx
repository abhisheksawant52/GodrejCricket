import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminRenderBoundary from './AdminRenderBoundary.jsx';
import './styles.css';
import './nav-highlights.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminRenderBoundary>
      <App />
    </AdminRenderBoundary>
  </React.StrictMode>,
);
