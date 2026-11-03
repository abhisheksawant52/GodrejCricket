import React from 'react';
import { createRoot } from 'react-dom/client';
import App, { AdminRenderBoundary } from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<AdminRenderBoundary><React.StrictMode><App /></React.StrictMode></AdminRenderBoundary>);
