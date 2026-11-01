import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleDot, Clock3, Download, Menu, Radio, Share2, ShieldCheck, Trash2, Trophy, Users, X } from 'lucide-react';

const types = [
  { key: 'Player', icon: '\uD83C\uDFC6', title: 'Play for the pride', tagline: 'Your moment. Your match. Your story.', desc: 'Men, women and kids are welcome. Register and get ready for match day.', fee: '\u20B9300 per person \u00B7 closes 15 Nov', deadline: '2026-11-16T00:00:00+05:30', cta: 'Register as player', fields: ['Age', 'Player category', 'Playing role', 'Experience'] },
  { key: 'Owner', icon: '\uD83E\uDDE2', title: 'Own your team', tagline: 'Build a team. Back a champion.', desc: 'Two owners are registered so far. Secure your place before registration closes.', fee: '\u20B910,000 minimum \u00B7 closes 8 Nov', deadline: '2026-11-09T00:00:00+05:30', cta: 'Register as owner', fields: [] },
]
const teams = [
  ['Nest United', 'NU', '#ff5aa7'], ['The Strikers', 'TS', '#ffd166'],
  ['Boundary Breakers', 'BB', '#70d6ff'], ['Wicket Warriors', 'WW', '#c5f363'],
  ['Pitch Panthers', 'PP', '#ff8fab'], ['Rising Royals', 'RR', '#b8a1ff'],
  ['Power Hitters', 'PH', '#ff9f1c'], ['Crease Kings', 'CK', '#65d6ad'],
].map(([name, short, color]) => ({ name, short, color, captain: 'To be announced', players: [] }));
const LOCAL_KEY = 'gnpl2026_registrations';
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };
const saveLocal = (rows) => localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
const syncFieldError = (input) => {
  const error = input.closest('label')?.querySelector('.field-error');
  if (!error) return;
  const label = input.closest('label')?.firstChild?.textContent?.trim() || 'This field';
  const message = input.validity.valueMissing ? (input.name === 'payment_time' ? 'Google Pay payment time is required so we can identify your payment and notify you.' : `${label} is required.`) : input.validity.patternMismatch ? 'Enter a valid phone number.' : '';
  error.textContent = message;
  error.hidden = !message;
  input.setAttribute('aria-invalid', String(Boolean(message)));
};
const csv = (rows) => {
  const cols = ['id', 'created_at', 'type', 'name', 'phone', 'wing', 'flat_no', 'apartment', 'payment_status', 'payment_reference', 'details'];
  const cell = (x) => `"${String(x ?? '').replaceAll('"', '""')}"`;
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(c === 'details' ? JSON.stringify(r[c] || {}) : c === 'wing' ? r.details?.wing : c === 'flat_no' ? r.details?.flat_no : r[c])).join(','))].join('\r\n');
};

function App() {
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [localAdmin, setLocalAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [rows, setRows] = useState(readLocal);
  const [online, setOnline] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('All');
  const [registrationCounts, setRegistrationCounts] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [shareNotice, setShareNotice] = useState('');
  const [playersVisible, setPlayersVisible] = useState(false);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [playersError, setPlayersError] = useState('');

  const refreshRegistrationCounts = async () => {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setRegistrationCounts(data.counts || null);
    } catch {
      // Keep the public counters in their loading state if the API is unavailable.
    }
  };

  const loadRows = async (pass = adminPass) => {
    if (!pass) return { ok: false, message: 'Enter the admin password to continue.' };
    try {
      const r = await fetch('/api/registrations', { headers: { 'x-admin-password': pass } });
      const contentType = r.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { ok: false, message: `The registrations API returned a non-JSON response (HTTP ${r.status}). Check Vercel deployment protection and the API route.` };
      }
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 401) return { ok: false, message: 'Password rejected, or ADMIN_PASSWORD is missing from this deployment.' };
        if (r.status === 503) return { ok: false, message: 'Database configuration is missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
        return { ok: false, message: data.error || `The registrations API returned HTTP ${r.status}.` };
      }
      setRows(data.registrations || []); setOnline(true); return { ok: true };
    } catch {
      return { ok: false, message: 'Could not reach the registrations API. Check the deployment and try again.' };
    }
  };
  useEffect(() => {
    let cancelled = false;
    fetch('/api/players', { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the player list.');
      if (!cancelled) { setRegisteredPlayers(data.players || []); setPlayersLoaded(true); setPlayersError(''); }
    }).catch(error => { if (!cancelled) setPlayersError(error.message || 'Could not load the player list.'); }).finally(() => { if (!cancelled) setPlayersLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    refreshRegistrationCounts();
    const timer = setInterval(refreshRegistrationCounts, 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (admin && online) { const timer = setInterval(() => loadRows(), 5000); return () => clearInterval(timer); } }, [admin, online, adminPass]);
  const counts = useMemo(() => ({ total: rows.length, paid: rows.filter(r => r.payment_status === 'Paid').length }), [rows]);
  const shown = filter === 'All' ? rows : rows.filter(r => r.type === filter);

  async function toggleRegisteredPlayers() {
    if (playersVisible) { setPlayersVisible(false); return; }
    setPlayersVisible(true);
    if (playersLoaded || playersLoading) return;
    setPlayersLoading(true); setPlayersError('');
    try {
      const response = await fetch('/api/players', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the player list.');
      setRegisteredPlayers(data.players || []); setPlayersLoaded(true);
    } catch (error) {
      setPlayersError(error.message || 'Could not load the player list. Please try again.');
    } finally { setPlayersLoading(false); }
  }

  async function shareLeague() {
    const shareData = { title: 'Godrej Nest Premier League 2026', text: 'Join GNPL 2026! Owner registration closes 8 November, player registration closes 15 November. Matches are on 12?13 December at Between A and B.', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`); setShareNotice('League details copied. Share them with your neighbours!'); }
    } catch (error) {
      if (error.name !== 'AbortError') setShareNotice('Copy this page link to invite your neighbours to GNPL.');
    }
  }

  async function submitRegistration(e) {
    e.preventDefault(); const formNode = e.currentTarget; setFormBusy(true); setNotice('');
    const form = new FormData(e.currentTarget);
    const details = Object.fromEntries(modal.fields.map((f, i) => [f.toLowerCase().replaceAll(' ', '_'), form.get(`extra${i}`) || '']));
    const wing = String(form.get('wing') || '').trim();
    const flatNo = String(form.get('flat_no') || '').trim();
    const paymentTransactionId = String(form.get('payment') || '').trim();
    const paymentTime = String(form.get('payment_time') || '').trim();
    const paymentReference = paymentTransactionId ? `${paymentTransactionId} / ${paymentTime}` : paymentTime;
    const payload = { type: modal.key, name: form.get('name'), phone: form.get('phone'), email: '', wing, flat_no: flatNo, apartment: `${wing} / ${flatNo}`, payment_reference: paymentReference, payment_time: paymentTime, details: { ...details, wing, flat_no: flatNo } };
    try {
      const response = await fetch('/api/registrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json(); setNotice(`You're on the list! Your ${modal.key.toLowerCase()} registration is confirmed. Payment will show as pending until reviewed.`);
        await refreshRegistrationCounts();
        if (online) await loadRows();
      } else if (response.status === 503 || response.status === 404 || !response.headers.get('content-type')?.includes('application/json')) {
        const row = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString(), payment_status: 'Pending' };
        const updated = [row, ...readLocal()]; saveLocal(updated); setRows(updated);
        setNotice('Registration saved on this device. Connect Supabase to collect registrations across devices.');
      } else { const data = await response.json(); throw new Error(data.error || 'Registration failed.'); }
      formNode.reset();
    } catch (err) { setNotice(err.message || 'Could not submit. Please try again.'); }
    finally { setFormBusy(false); }
  }

  async function openAdmin() {
    setMenuOpen(false);
    setAdmin(true); setLocalAdmin(false); setNotice('');
    const pass = sessionStorage.getItem('gnpl_admin') || ''; setAdminPass(pass);
    if (pass && (await loadRows(pass)).ok) return;
  }
  async function signIn(e) {
    e.preventDefault(); const p = new FormData(e.currentTarget).get('password');
    const result = await loadRows(p);
    if (result.ok) { setAdminPass(p); sessionStorage.setItem('gnpl_admin', p); }
    else setNotice(result.message);
  }
  async function setPaid(row) {
    const next = row.payment_status === 'Paid' ? 'Pending' : 'Paid';
    if (online) {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: row.id, payment_status: next }) });
      if (!response.ok) { setNotice('Payment update failed.'); return; }
      await loadRows();
    } else {
      const updated = rows.map(r => r.id === row.id ? { ...r, payment_status: next } : r); saveLocal(updated); setRows(updated);
    }
  }
  async function setTeamAssignment(row, teamName) {
    if (row.type !== 'Player') return;
    setNotice('');
    if (!online) {
      const updated = rows.map(item => item.id === row.id ? { ...item, details: { ...(item.details || {}), team_name: teamName || null } } : item);
      saveLocal(updated); setRows(updated); return;
    }
    try {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: row.id, team_name: teamName }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || 'Could not update team assignment.'); return; }
      await loadRows();
      const listResponse = await fetch('/api/players', { cache: 'no-store' });
      const listData = await listResponse.json();
      if (listResponse.ok) { setRegisteredPlayers(listData.players || []); setPlayersLoaded(true); }
    } catch { setNotice('Could not reach the registrations API. Team assignment was not updated.'); }
  }

  async function deleteRegistration() {
    if (!deleteTarget) return;
    setDeleteBusy(true); setNotice('');
    if (!online) {
      const updated = rows.filter(row => row.id !== deleteTarget.id);
      saveLocal(updated); setRows(updated); setDeleteTarget(null); setDeleteBusy(false);
      return;
    }
    try {
      const response = await fetch('/api/registrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
        body: JSON.stringify({ id: deleteTarget.id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || 'Could not delete registration.'); return; }
      setDeleteTarget(null);
      await loadRows();
      await refreshRegistrationCounts();
    } catch {
      setNotice('Could not reach the registrations API. The registration was not deleted.');
    } finally {
      setDeleteBusy(false);
    }
  }
  const exportRows = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(shown)], { type: 'text/csv;charset=utf-8' })); a.download = `gnpl-2026-${filter.toLowerCase()}-registrations.csv`; a.click(); URL.revokeObjectURL(a.href); };

  return <div className="site-shell">
    <div className="topline"><span><Radio size={13} className="live-dot" /> COMMUNITY CRICKET. BIG MATCH ENERGY.</span><span className="topline-right">ARRANGED BY GODREJ NEST CULTURAL TEAM</span></div>
    <header className="nav wrap"><a href="#home" className="brand"><img src="/nest-sanskriti-logo.png" alt="Nest Sanskriti Mandal" className="brand-logo" /><span className="brand-copy">GN<span className="brand-accent">PL</span><small>GODREJ NEST PREMIER LEAGUE</small></span></a><div className="header-cricket" aria-hidden="true"><svg viewBox="0 0 360 126" role="presentation"><ellipse className="header-orbit" cx="182" cy="73" rx="154" ry="45"/><ellipse className="header-pitch" cx="187" cy="94" rx="102" ry="19"/><path className="header-pitch-line" d="M118 92h138"/><g className="header-bowler"><circle cx="57" cy="38" r="9"/><path d="M55 49 48 72l17 4 7-24m-12 2L43 39m15 12 12-14m-7 25L48 91m19-15 9 16"/></g><g className="header-batter"><circle cx="184" cy="30" r="10"/><path d="m180 41-11 26 18 8 11-25m-20 2-18 12m29-11 12 12m-22 7-12 24m20-22 15 21"/><g className="header-bat"><path d="M0 0 33-39"/><path d="m25-48 14 10-6 8-14-10z"/></g></g><g className="header-wickets"><path d="M279 75V43m8 32V40m8 35V43m-17 0h20"/></g><g className="header-ball"><circle cx="104" cy="59" r="5"/><path d="M101 56q5 2 6 6"/></g><text className="header-six" x="247" y="31">SIX!</text></svg></div><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button><nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#league" onClick={() => setMenuOpen(false)}>The league</a><a href="#teams" onClick={() => setMenuOpen(false)}>Teams</a><a href="#register" onClick={() => setMenuOpen(false)}>Register</a><a href="#schedule" onClick={() => setMenuOpen(false)}>Match day</a><button className="nav-admin" onClick={openAdmin}>Admin <ArrowUpRight size={15} /></button></nav></header>

    <main>
      <section className="hero wrap" id="home">
        <div className="hero-grain" />
        <div className="hero-copy"><div className="organizer-banner">ARRANGED BY <strong>GODREJ NEST CULTURAL TEAM</strong></div><div className="eyebrow"><span className="eyebrow-line" /> THE NEIGHBOURHOOD LEAGUE IS BACK</div><h1 className="league-title"><span>GODREJ NEST</span><br /><span className="league-title-second">PREMIER LEAGUE</span> <em>2026</em></h1><p className="hero-text">Never held a bat? This is your time to start. GNPL welcomes beginners and seasoned players for a weekend of cricket, friends, and big cheers.</p><div className="hero-actions"><a className="button button-lime" href="#register">Register now <ArrowRight size={17} /></a><a className="text-link" href="#league">Meet the league <ArrowDown size={15} /></a><button className="share-league-button" onClick={shareLeague}><Share2 size={15} /> Share league</button></div>{shareNotice && <p className="share-notice" role="status">{shareNotice}</p>}<div className="hero-invite"><span className="hero-invite-tag">THE LEAGUE IS FOR EVERYONE</span><strong>Play. Cheer. Celebrate.</strong><div className="hero-event-meta"><span><small>MATCH DATES</small><strong>12 & 13 DECEMBER 2026</strong></span><span><small>VENUE</small><strong>BETWEEN A AND B</strong></span></div><small>Gents, ladies, senior citizens and children are welcome.</small><small>Never held a bat? You are welcome here. Snacks and Glucose-D will be provided at the venue.</small><div className="venue-treats" aria-hidden="true"><div className="treat-card treat-popcorn"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 24h36l-5 34H19z" fill="#e72e77" stroke="#ffd9e8" strokeWidth="2"/><path d="m22 25 4 31m12-31-4 31" stroke="#ffb8d4" strokeWidth="5"/><circle cx="20" cy="21" r="8" fill="#fff0b3"/><circle cx="31" cy="17" r="10" fill="#ffe8a0"/><circle cx="43" cy="21" r="9" fill="#fff3c2"/><circle cx="51" cy="24" r="7" fill="#ffe49a"/></svg><span>SNACKS</span></div><div className="treat-card treat-drink"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 8h16l3 8v5l5 6v29a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V27l5-6v-5z" fill="#f2cf58" stroke="#fff0bd" strokeWidth="2"/><path d="M22 33h20v13H22z" fill="#fff3c2"/><path d="M27 4h10v5H27z" fill="#f2cf58" stroke="#fff0bd" strokeWidth="2"/><text x="23" y="42" fill="#744d16" fontSize="7" fontWeight="700">G-D</text></svg><span>GLUCOSE-D</span></div></div></div><div className="hero-proof"><div className="avatar-stack"><b>🏏</b><b>🧢</b><b>🙌</b><b>+</b></div><span>Players, owners & fans<br /><strong>all under one roof</strong></span></div></div>
        <div className="scroll-cue"><span /> SCROLL TO EXPLORE</div>
      </section>

      <section className="register-section" id="register"><div className="wrap"><div className="section-tag">01 / REGISTER</div><div className="register-heading"><div><h2>HOW WILL<br /><em>YOU PLAY?</em></h2></div><p>Players and team owners: take your place in the league.<br />Choose a registration and get ready for match day.</p></div><div className="register-grid">{types.map((t, i) => <article className={`register-card card-${i}`} key={t.key}><div className="card-top"><span className="card-number">0{i + 1} / GNPL</span><span className="card-emoji">{t.icon}</span></div><div className="role-art" aria-hidden="true">{i === 0 ? <><div className="role-player"><span className="player-helmet" /><span className="player-body" /><span className="player-bat" /></div><span className="role-ball" /></> : i === 1 ? <><span className="owner-jersey jersey-one" /><span className="owner-jersey jersey-two" /><span className="owner-trophy"><Trophy size={26} /></span></> : <><span className="audience-rings" /><Users size={34} /><span className="cheer-stars">✦ ✦ ✦</span></>}</div><h3>{t.title}</h3><p className="register-tagline">{t.tagline}</p><p>{t.desc}</p><div className="deadline-badge"><span className="deadline-pulse" aria-hidden="true" />{Math.ceil((new Date(t.deadline).getTime() - clockNow) / 86400000) > 0 ? `${Math.ceil((new Date(t.deadline).getTime() - clockNow) / 86400000)} DAYS LEFT` : 'REGISTRATION CLOSED'}<strong>{t.key === 'Owner' ? 'CLOSES 8 NOVEMBER' : 'CLOSES 15 NOVEMBER'}</strong></div><div className="card-bottom"><span className="entry-fee">{t.fee}</span><button onClick={() => { setNotice(''); setFormReady(false); setModal(t); }}>Choose your spot <ArrowUpRight size={16} /></button></div></article>)}</div><div className="community-scene"><div className="scene-heading"><span className="scene-kicker">THE WHOLE NEST, IN ONE GAME</span><h3>PLAYERS TAKE THE FIELD.<br /><em>NEIGHBOURS CHEER THEM ON.</em></h3></div><svg className="community-scene-art" viewBox="0 0 1100 410" role="img" aria-label="Cricket players batting and bowling while neighbours cheer from the stands"><defs><linearGradient id="scene-sky" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#41123b"/><stop offset="1" stopColor="#10283b"/></linearGradient><linearGradient id="scene-grass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#295c39"/><stop offset="1" stopColor="#0e2c22"/></linearGradient><linearGradient id="scene-jersey" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8ff83"/><stop offset="1" stopColor="#74c950"/></linearGradient></defs><rect width="1100" height="410" rx="18" fill="url(#scene-sky)"/><path d="M0 22Q550 155 1100 22V210H0Z" fill="#221332"/><path d="M28 45Q550 158 1072 45" fill="none" stroke="#ff6cb5" strokeOpacity=".5" strokeWidth="3"/><path d="M60 72Q550 175 1040 72" fill="none" stroke="#58e5ec" strokeOpacity=".4" strokeWidth="2"/><g className="scene-crowd" fill="#ffd166" stroke="#ffb6d5" strokeWidth="3"><g transform="translate(105 110)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(195 132) scale(.85)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(285 147) scale(.72)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(895 147) scale(.72)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(985 132) scale(.85)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g></g><path d="M0 235Q550 185 1100 235V410H0Z" fill="url(#scene-grass)"/><ellipse cx="550" cy="325" rx="390" ry="90" fill="none" stroke="#b8ed84" strokeOpacity=".6" strokeWidth="2"/><path d="M495 270h110v90H495z" fill="#bd9a64" fillOpacity=".5"/><path d="M510 284v48m12-48v48m56-48v48m12-48v48" stroke="#fff1c8" strokeWidth="4"/><g className="scene-batter"><circle cx="536" cy="184" r="23" fill="#c98757"/><path d="M514 179q20-31 46-4v10h-46z" fill="#17251b"/><path d="m514 212-30 92h92l-24-92q-19-14-38 0" fill="url(#scene-jersey)"/><path d="m512 225-43 61m87-60 28 55" stroke="#c98757" strokeWidth="19" strokeLinecap="round"/><path d="m523 301-20 82m41-82 26 78" stroke="#e6b082" strokeWidth="23" strokeLinecap="round"/><path d="m490 386 30-5m37 3 31-8" stroke="#111d19" strokeWidth="17" strokeLinecap="round"/><path d="m574 280 74-110" stroke="#e8c58b" strokeWidth="13" strokeLinecap="round"/><path d="m646 174 8-12 9 7-8 12z" fill="#fff0c8"/></g><g className="scene-bowler"><circle cx="315" cy="224" r="16" fill="#b97854"/><path d="M300 220q15-21 31-2v7h-31z" fill="#1c2920"/><path d="m300 244-19 62h62l-13-62q-15-10-30 0" fill="#ff5aa7"/><path d="m302 251-36 31m49-34 35-19" stroke="#b97854" strokeWidth="12" strokeLinecap="round"/><path d="m300 303-10 56m29-56 13 54" stroke="#c98757" strokeWidth="15" strokeLinecap="round"/><path d="m282 361 22-3m22 1 22-2" stroke="#111d19" strokeWidth="13" strokeLinecap="round"/></g><circle className="scene-ball" cx="377" cy="233" r="9" fill="#ff5b69"/><path d="M372 229q8 1 10 8" fill="none" stroke="#fff" strokeWidth="1.5"/><g fill="#d7ff59"><path d="m790 98 5 13 13 5-13 5-5 13-5-13-13-5 13-5z"/><path d="m410 119 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></g></svg><div className="scene-foot"><span><strong>PLAY</strong> with pride</span><span><strong>CHEER</strong> for your neighbours</span><span><strong>CELEBRATE</strong> together</span></div></div><p className="fee-note"><ShieldCheck size={14} /> Player registration is &#8377;300 per person for men, women and kids, and closes 15 November. Owner registration is &#8377;10,000 minimum and closes 8 November. Two owners are registered so far.</p><div className="tournament-invite"><span className="invite-ball" aria-hidden="true" /><div><strong>Everyone is invited to play, cheer and celebrate!</strong><p>Gents, ladies, senior citizens and children are welcome. Snacks and Glucose-D will be provided at the venue. Player auction: 29 November. Matches: 12&#8211;13 December 2026!</p></div><span className="invite-ball invite-ball-two" aria-hidden="true" /></div><div className="registration-faq"><div className="section-tag">QUICK ANSWERS</div><h3>GOOD TO <em>KNOW.</em></h3><details><summary>When do registrations close?</summary><p>Owner registrations close on 8 November. Player registrations close on 15 November 2026.</p></details><details><summary>What payment information should I enter?</summary><p>Enter your Google Pay payment time so the organisers can identify your payment and notify you. The transaction ID is optional.</p></details><details><summary>When will teams and player squads be announced?</summary><p>Team allocations and player squads will be announced after owner and player registrations are reviewed.</p></details></div></div></section>

      <section className="ticker" aria-label="Tournament highlights"><div className="ticker-track">{Array.from({ length: 2 }, (_, i) => <span key={i}>COMMUNITY FIRST <b>✳</b> CRICKET ALWAYS <b>✳</b> GOOD TIMES GUARANTEED <b>✳</b> GNPL 2026 <b>✳</b> COMMUNITY FIRST <b>✳</b> CRICKET ALWAYS <b>✳</b> GOOD TIMES GUARANTEED <b>✳</b></span>)}</div></section>

      <section className="intro-section wrap" id="league"><div className="section-tag">02 / THE LEAGUE</div><div className="intro-grid"><h2>MORE THAN<br />A <em>MATCH.</em></h2><div className="intro-copy"><p>It’s the neighbour who bowls a mean yorker. The family in the front row. The team that starts as strangers and ends as friends.</p><p>Godrej Nest Premier League brings every tower and every neighbour together through cricket. Arranged by Godrej Nest Cultural Team.</p><a href="#register" className="underlink">Find your place in the league <ArrowRight size={15} /></a></div></div><div className="stat-row"><div><strong>02</strong><span>WAYS TO JOIN</span></div><div><strong>01</strong><span>COMMUNITY</span></div><div><strong>∞</strong><span>MEMORIES TO MAKE</span></div><div className="stat-note"><span className="live-dot" /> REGISTRATION IS OPEN</div></div><div className="live-board"><div className="live-board-head"><div><span className="live-dot" /> LIVE LEAGUE BOARD</div><span className="live-refresh">Live · updates every 5 seconds</span></div><div className="live-board-grid"><div className="live-total"><small>TOTAL REGISTRATIONS</small><strong>{registrationCounts ? registrationCounts.total : '—'}</strong><span>THE NEST IS FILLING UP</span></div><button type="button" className="live-count player-count-toggle" aria-expanded={playersVisible} aria-controls="registered-player-panel" onClick={toggleRegisteredPlayers}><small>PLAYERS</small><strong>{registrationCounts ? registrationCounts.players : '\u2014'}</strong><span>{playersVisible ? 'CLICK TO HIDE NAMES' : 'CLICK TO VIEW PLAYER NAMES'}</span></button><div className="live-count"><small>TEAM OWNERS</small><strong>{registrationCounts ? registrationCounts.owners : '—'}</strong><span>BUILDING THEIR TEAMS</span></div></div></div>{playersVisible && <div className="registered-player-panel live-player-panel" id="registered-player-panel" aria-live="polite">{playersLoading ? <p>Loading registered players...</p> : playersError ? <p>{playersError}</p> : registeredPlayers.length ? <><div className="player-panel-heading">REGISTERED PLAYERS <span>{registeredPlayers.length}</span></div><ul>{registeredPlayers.map((player, index) => <li key={`${player.name}-${index}`}>{player.name}</li>)}</ul></> : <p>No player registrations yet. Registered player names will appear here.</p>}<small>Names are shown publicly; contact and payment details stay private.</small></div>}</section>

      <section className="teams-section wrap" id="teams">
        <div className="section-tag">03 / MEET THE TEAMS</div>
        <div className="teams-heading"><h2>THE SQUADS.<br /><em>THE PRIDE.</em></h2><p>Eight proposed teams. Final team allocations and player squads will follow owner and player registrations; team and squad details are yet to be announced.</p></div>
        <div className="teams-grid">{teams.map((team, index) => {
          const squad = registeredPlayers.filter(player => player.team_name === team.name);
          return <article className="team-card" key={team.name} style={{'--team-accent': team.color}}>
            <div className="team-card-top"><span>GNPL 2026 / TEAM {String(index + 1).padStart(2, '0')}</span><span className="team-status">{squad.length ? 'SQUAD CONFIRMED' : 'TO BE ANNOUNCED'}</span></div>
            <div className="team-identity"><div className="team-logo" aria-label={`${team.name} logo`}><span>{team.short}</span><small>GNPL</small></div><div><h3>{team.name}</h3><p><Trophy size={14} /> Captain: <strong>{team.captain}</strong></p></div></div>
            <div className="squad-heading"><span><Users size={15} /> PLAYER SQUAD</span><strong>{squad.length ? `${squad.length} PLAYERS` : 'TO BE ANNOUNCED'}</strong></div>
            {squad.length ? <ul className="squad-list">{squad.map((player, playerIndex) => <li key={`${player.name}-${playerIndex}`}>{player.name}</li>)}</ul> : <div className="squad-empty"><span className="squad-people"><i/><i/><i/><i/></span><p>Player names will appear here after team assignments are finalized.</p></div>}
          </article>;
        })}</div>
      </section>



      <section className="matchday wrap" id="schedule"><div className="matchday-left"><div className="section-tag">04 / SAVE THE FEELING</div><h2>THE CROWD.<br /><em>THE CRACK.</em><br />THE CHEER.</h2><p>One boundary can bring the whole neighbourhood to its feet. Get ready for a season worth showing up for.</p><a href="#register" className="button button-lime">Count me in <ArrowRight size={17} /></a></div></section>
    </main>

    <footer className="footer"><div className="wrap footer-main"><a href="#home" className="brand"><span className="brand-mark"><Trophy size={21} /></span><span>GN<span className="brand-accent">PL</span><small>GODREJ NEST PREMIER LEAGUE</small></span></a><p>Arranged by<br /><strong>Godrej Nest Cultural Team</strong></p><a className="footer-top" href="#home">BACK TO TOP ↑</a></div><div className="wrap footer-bottom"><span>© 2026 GNPL · GODREJ NEST PREMIER LEAGUE</span><button onClick={openAdmin}>Registration dashboard</button><span>Website created by Abhishek Hemant Sawant</span><span>PLAY WITH PRIDE <span className="lime">✳</span></span></div></footer>

    {modal && <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="dialog register-dialog" role="dialog" aria-modal="true" aria-labelledby="reg-title"><button className="close" onClick={() => setModal(null)} aria-label="Close"><X /></button><div className="dialog-icon">{modal.icon}</div><div className="section-tag">GNPL 2026 / {modal.key.toUpperCase()}</div><h2 id="reg-title">Your place<br /><em>starts here.</em></h2><p className="modal-entry-fee">Registration fee: <strong>{modal.fee}</strong></p>{notice ? <div className="success-state"><span className="success-icon"><Check /></span><p>{notice}</p><button className="button button-lime" onClick={() => { setModal(null); setNotice(''); }}>Done <ArrowRight size={16} /></button></div> : <form className="registration-form" onSubmit={submitRegistration} onBlur={e => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) { e.target.dataset.touched = "true"; syncFieldError(e.target); } }} onInput={e => { setFormReady(e.currentTarget.checkValidity()); if (e.target.dataset.touched) syncFieldError(e.target); }}><a className="payment-qr-link" href="/payment-qr.jpeg" target="_blank" rel="noreferrer"><img src="/payment-qr.jpeg" alt="Scan this QR code to pay Abhishek Sawant by UPI" /><span>Scan to pay with any UPI app ? tap to open QR</span></a><div className="form-grid"><label>Full name<input name="name" required placeholder="Your name" autoComplete="name" /><small className="field-error" hidden></small></label><label>Mobile number<input name="phone" required inputMode="tel" placeholder="+91 00000 00000" autoComplete="tel" pattern="[+0-9() -]{7,20}" /><small className="field-error" hidden></small></label><label>Wing<input name="wing" required placeholder="e.g. A Wing" /><small className="field-error" hidden></small></label><label>Flat No.<input name="flat_no" required placeholder="e.g. 1204" /><small className="field-error" hidden></small></label>{modal.fields.map((f, i) => <label key={f}>{f}{f === "Playing role" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose your role</option><option value="Bowler">Bowler</option><option value="Batter">Batter</option></select> : f === "Player category" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose category</option><option value="Men">Men</option><option value="Women">Women</option><option value="Kids">Kids</option></select> : <input name={`extra${i}`} required placeholder={`Your ${f.toLowerCase()}`} />}<small className="field-error" hidden></small></label>)}<label className="full-field">Google Pay transaction ID (optional)<input name="payment" placeholder="Enter transaction ID if available" /><small className="field-error" hidden></small></label><label className="full-field">Google Pay payment time<input name="payment_time" required placeholder="e.g. 6:42 PM" /><small className="field-error" hidden></small><small className="field-hint">Payment time is required so we can identify your payment and notify you. Transaction ID is optional.</small></label></div><button className="button button-lime submit-button" disabled={formBusy || !formReady}>{formBusy ? 'Submitting…' : 'Submit registration'} <ArrowRight size={16} /></button><p className="form-privacy">Your name will appear in the public GNPL player list. Your contact and payment details remain private; payment is marked pending until verified.</p></form>}</div></div>}

    {admin && <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setAdmin(false)}><div className="dialog admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title"><button className="close" onClick={() => setAdmin(false)} aria-label="Close"><X /></button>{!online && !localAdmin ? <><div className="section-tag">ORGANISER ACCESS</div><h2 id="admin-title">Registration<br /><em>dashboard.</em></h2><form onSubmit={signIn} className="admin-login"><label>Admin password<input name="password" type="password" required autoComplete="current-password" placeholder="Enter dashboard password" /></label><button className="button button-lime">Open dashboard <ArrowRight size={16} /></button></form><button className="local-view" onClick={() => { setRows(readLocal()); setLocalAdmin(true); }}>View registrations on this device ({readLocal().length})</button>{notice && <p className="notice">{notice}</p>}</> : <><div className="dashboard-head"><div><div className="section-tag">GNPL 2026 / {online ? 'LIVE DASHBOARD' : 'THIS DEVICE'}</div><h2 id="admin-title">The <em>line-up.</em></h2></div><button className="export-button" onClick={exportRows}><Download size={16} /> Export CSV</button></div><div className="dash-stats"><div><span>TOTAL REGISTRATIONS</span><strong>{counts.total}</strong></div><div><span>PAYMENTS CONFIRMED</span><strong>{counts.paid}</strong></div><div><span>PAYMENTS PENDING</span><strong>{counts.total - counts.paid}</strong></div></div><div className="dash-toolbar"><div className="filters">{['All', 'Player', 'Owner'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>{online && <span className="refresh-status"><Radio size={13} className="live-dot" /> Refreshes every 5 sec</span>}</div><div className="table-wrap"><table><thead><tr><th>NAME / CONTACT</th><th>TYPE</th><th>WING / FLAT</th><th>REGISTERED</th><th>TEAM ASSIGNMENT</th><th>PAYMENT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{shown.map(r => <tr key={r.id}><td><strong>{r.name}</strong><small>{r.phone}</small></td><td>{r.type}</td><td>{r.details?.wing && r.details?.flat_no ? <>{r.details.wing} / {r.details.flat_no}</> : r.apartment || "—"}</td><td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td><td>{r.type === 'Player' ? <select className="admin-team-select" aria-label={`Assign ${r.name} to a team`} value={r.details?.team_name || ''} onChange={event => setTeamAssignment(r, event.target.value)}><option value="">Unassigned</option>{teams.map(team => <option key={team.name} value={team.name}>{team.name}</option>)}</select> : <span>&#8212;</span>}</td><td>{r.payment_reference || '&#8212;'}</td><td><button className={`pay-status ${r.payment_status === 'Paid' ? 'paid' : ''}`} onClick={() => setPaid(r)}><span />{r.payment_status || 'Pending'}</button></td><td><button className="delete-button" onClick={() => setDeleteTarget(r)} aria-label={'Delete ' + r.name}><Trash2 size={14} /> Delete</button></td></tr>)}</tbody></table>{shown.length === 0 && <div className="empty-state"><Users size={28} /><p>No registrations yet. Share the link and get the league started.</p></div>}</div>{notice && <p className="notice">{notice}</p>}<div className="dash-foot"><Clock3 size={14} /> {online ? 'Changes are saved to the registrations database.' : 'This device only · local entries are not shared with other devices.'}</div></>}</div></div>}
    {deleteTarget && <div className="confirm-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && !deleteBusy && setDeleteTarget(null)}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="section-tag">REMOVE REGISTRATION</div><h2 id="delete-title">Delete this <em>entry?</em></h2><p>Remove <strong>{deleteTarget.name}</strong> ({deleteTarget.type}) from the GNPL registration list? This action cannot be undone.</p><div className="confirm-actions"><button className="cancel-delete" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>Keep registration</button><button className="confirm-delete" onClick={deleteRegistration} disabled={deleteBusy}>{deleteBusy ? 'Deleting…' : <><Trash2 size={15} /> Delete registration</>}</button></div></section></div>}
  </div>;
}

export default App;
