import React from 'react';
import { createRoot } from 'react-dom/client';
import App, { AdminRenderBoundary } from './App.jsx';
import PlayBid from './PlayBid.jsx';
import './styles.css';
import './playbid.css';
import './auction-state.css';
import './tournament-management.css';
import './auction-initialization.css';
import './bid-history.css';

const isPlayBidPreview = !window.location.pathname.startsWith('/gnpl');
document.title = isPlayBidPreview ? 'PlayBid — Cricket Auction Platform' : document.title;
createRoot(document.getElementById('root')).render(<React.StrictMode>{isPlayBidPreview ? <PlayBid /> : <AdminRenderBoundary><App /></AdminRenderBoundary>}</React.StrictMode>);
