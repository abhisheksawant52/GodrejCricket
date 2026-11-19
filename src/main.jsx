import React from 'react';
import { createRoot } from 'react-dom/client';
import App, { AdminRenderBoundary } from './App.jsx';
import PlayBid from './PlayBid.jsx';
import './styles.css';
import './nav-highlights.css';
import './playbid.css';
import './auction-state.css';
import './tournament-management.css';
import './auction-initialization.css';
import './bid-history.css';
import './gnpl-auction.css';

const isPlayBidPreview = window.location.pathname === '/playbid' || window.location.pathname.startsWith('/playbid/');
if (isPlayBidPreview) document.title = 'PlayBid — Cricket Auction Platform';
createRoot(document.getElementById('root')).render(<React.StrictMode>{isPlayBidPreview ? <PlayBid /> : <AdminRenderBoundary><App /></AdminRenderBoundary>}</React.StrictMode>);
