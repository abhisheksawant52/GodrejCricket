import React, { useEffect, useState } from 'react';
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
import './auction-auth.css';
import './auction-workspace.css';
import './auction-pink.css';
import './auction-player-profile.css';

const isPlayBidPreview = window.location.pathname === '/playbid' || window.location.pathname.startsWith('/playbid/');
if (isPlayBidPreview) document.title = 'PlayBid — Cricket Auction Platform';

function AuctionAdminGate() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/auction-auth', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => setAuthenticated(response.ok))
      .catch(() => setError('Could not verify admin access. Please try again.'))
      .finally(() => setChecking(false));
  }, []);
  async function signIn(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/auction-auth', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error(response.status === 503 ? 'Admin access is not configured on this deployment.' : 'Incorrect admin password.');
      setPassword('');
      setAuthenticated(true);
    } catch (cause) {
      setError(cause.message || 'Could not sign in. Please try again.');
    }
  }
  async function signOut() {
    await fetch('/api/auction-auth', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    setAuthenticated(false);
  }
  if (checking) return <main className="auction-auth-screen"><section className="auction-auth-card"><span className="auction-auth-mark">GN</span><p>VERIFYING ADMIN ACCESS</p></section></main>;
  if (authenticated) return <PlayBid onLogout={signOut} />;
  return <main className="auction-auth-screen"><form className="auction-auth-card" onSubmit={signIn}>
    <span className="auction-auth-mark">GN</span><div className="auction-auth-kicker">GODREJ NEST PREMIER LEAGUE</div><div className="auction-auth-user">USER: ABHISHEK · ADMIN ACCESS</div>
    <h1>Admin <em>access</em></h1><p>Sign in with your GNPL admin password to open the Auction Portal.</p>
    <label htmlFor="auction-admin-password">Admin password</label>
    <input id="auction-admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
    {error && <div className="auction-auth-error" role="alert">{error}</div>}
    <button type="submit">Continue to Auction Portal <span>→</span></button>
    <a href="/">Back to GNPL home</a>
  </form></main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode>{isPlayBidPreview ? <AuctionAdminGate /> : <AdminRenderBoundary><App /></AdminRenderBoundary>}</React.StrictMode>);
