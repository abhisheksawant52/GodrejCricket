import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleDot, Clock3, Download, Printer, Menu, Radio, Share2, ShieldCheck, Trash2, Trophy, Users, X, Upload, MapPin, Shirt, Cookie, GlassWater, Megaphone, Camera } from 'lucide-react';
import PlayerProfile from './PlayerProfile.jsx';
import { createPortal } from 'react-dom';

const types = [
  { key: 'Player', icon: '\uD83C\uDFC6', title: 'Play for the pride', tagline: 'Your moment. Your match. Your story.', desc: 'Kids aged 8–15 and men and women 16+ are welcome. Register and get ready for match day.', fee: 'Men (16+) ₹600 · Women (16+) ₹400 · Kids (8–15) ₹300 · T-shirt included', deadline: '2026-11-16T00:00:00+05:30', cta: 'Register as player', fields: ['Age', 'Player category', 'Playing role', 'Experience', 'T-shirt Size', 'T-Shirt Name', 'T-Shirt Number'] },
  { key: 'Owner', icon: '\uD83E\uDDE2', title: 'Own your team', tagline: 'Build a team. Back a champion.', desc: 'Owner spots are limited and confirmed first come, first served. Registered owners will bid for players at the auction.', fee: '\u20B910,000 minimum \u00B7 closes 8 Nov', deadline: '2026-11-09T00:00:00+05:30', cta: 'Register as owner', fields: ['T-shirt Size', 'T-Shirt Name', 'T-Shirt Number'] },
  { key: 'Audience', icon: '\uD83D\uDC55', title: 'GNPL fan T-shirt', tagline: 'Back the team. Wear the colours.', desc: 'Order the GNPL 2026 audience jersey. Choose your size and personalize the back.', fee: '₹300 each', deadline: '2026-11-30T00:00:00+05:30', cta: 'Buy now', fields: ['T-shirt Size', 'T-Shirt Name', 'T-Shirt Number'] },
]
const teams = [
  ['Nest United', 'NU', '#ff5aa7'], ['The Strikers', 'TS', '#ffd166'],
  ['Boundary Breakers', 'BB', '#70d6ff'], ['Wicket Warriors', 'WW', '#c5f363'],
  ['Pitch Panthers', 'PP', '#ff8fab'], ['Rising Royals', 'RR', '#b8a1ff'],
  ['Power Hitters', 'PH', '#ff9f1c'], ['Crease Kings', 'CK', '#65d6ad'],
].map(([name, short, color]) => ({ name, short, color, captain: 'To be announced', players: [] }));
const LOCAL_KEY = 'gnpl2026_registrations';
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };
const normalizeRows = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object' && !Array.isArray(row)).map(row => ({ ...row, details: row.details && typeof row.details === 'object' && !Array.isArray(row.details) ? row.details : {} })) : [];
const saveLocal = (rows) => localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
export class AdminRenderBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('GNPL admin dashboard render failed', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="overlay admin-overlay"><section className="dialog admin-dialog admin-render-error" role="alert"><div className="section-tag">ADMIN DASHBOARD ERROR</div><h2>The dashboard<br /><em>could not load.</em></h2><p>The page hit a display error after sign-in. Error details:</p><pre>{this.state.error.message || String(this.state.error)}</pre><button className="button button-lime" onClick={() => window.location.reload()}>Reload page <ArrowRight size={16} /></button></section></div>;
  }
}
const imageData = async file => {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose an image smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .62));
  if (!blob) throw new Error('Could not compress this image. Please choose another.');
  return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
};
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
  const cols = ['id', 'created_at', 'type', 'name', 'phone', 'wing', 'flat_no', 'apartment', 'payment_status', 'payment_reference', 'tshirt_size', 'tshirt_name', 'tshirt_number', 'category', 'team_name', 'jersey_issued', 'jersey_issued_at', 'details'];
  const cell = (x) => `"${String(x ?? '').replaceAll('"', '""')}"`;
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(c === 'details' ? JSON.stringify(r[c] || {}) : c === 'wing' ? r.details?.wing : c === 'flat_no' ? r.details?.flat_no : c === 'tshirt_size' ? r.details?.['t-shirt_size'] : c === 'tshirt_name' ? r.details?.['t-shirt_name'] : c === 'tshirt_number' ? r.details?.['t-shirt_number'] : c === 'team_name' ? r.details?.team_name : c === 'category' ? r.details?.player_category : c === 'jersey_issued' ? Boolean(r.details?.jersey_issued) : c === 'jersey_issued_at' ? r.details?.jersey_issued_at : r[c])).join(','))].join('\r\n');
};

function App() {
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [localAdmin, setLocalAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [rows, setRows] = useState(() => normalizeRows(readLocal()));
  const [online, setOnline] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [filter, setFilter] = useState('All');
  const [adminSearch, setAdminSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkTeam, setBulkTeam] = useState('');
  const [teamFilter, setTeamFilter] = useState('All teams');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [jerseyFilter, setJerseyFilter] = useState('All');
  const [shirtSizeFilter, setShirtSizeFilter] = useState('All sizes');
  const [registrationCounts, setRegistrationCounts] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [shareNotice, setShareNotice] = useState('');
  const [playersVisible, setPlayersVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const [playerPhoto, setPlayerPhoto] = useState('');
  const [photoPreparing, setPhotoPreparing] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [photoTarget, setPhotoTarget] = useState(null);
  const [photoUpload, setPhotoUpload] = useState('');
  const [photoPhone, setPhotoPhone] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');

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
      setRows(normalizeRows(data.registrations)); setOnline(true); return { ok: true };
    } catch {
      return { ok: false, message: 'Could not reach the registrations API. Check the deployment and try again.' };
    }
  };
  useEffect(() => {
    let cancelled = false;
    const refreshPlayers = async () => {
      try {
        const response = await fetch('/api/players', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load the player list.');
        if (!cancelled) { setRegisteredPlayers(data.players || []); setPlayersLoaded(true); setPlayersError(''); }
      } catch (error) { if (!cancelled && !playersLoaded) setPlayersError(error.message || 'Could not load the player list.'); }
      finally { if (!cancelled) setPlayersLoading(false); }
    };
    refreshPlayers();
    const timer = setInterval(refreshPlayers, 5000);
    return () => { cancelled = true; clearInterval(timer); };
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
  const filteredRows = (filter === 'Jersey Distribution' ? rows.filter(r => ['Player', 'Owner', 'Audience'].includes(r.type)) : filter === 'Audience T-shirts' ? rows.filter(r => r.type === 'Audience') : filter === 'All' ? rows : ['Men', 'Women', 'Kids'].includes(filter)
    ? rows.filter(r => r.type === 'Player' && String(r.details?.player_category || '').trim().toLowerCase() === filter.toLowerCase())
    : rows.filter(r => r.type === filter)).filter(r => teamFilter === 'All teams' || (teamFilter === 'Unassigned' ? r.type === 'Player' && !r.details?.team_name : r.details?.team_name === teamFilter)).filter(r => paymentFilter === 'All' || (paymentFilter === 'Pending' ? r.payment_status !== 'Paid' : r.payment_status === 'Paid')).filter(r => !['Jersey Distribution', 'Audience T-shirts'].includes(filter) || jerseyFilter === 'All' || (jerseyFilter === 'Issued' ? r.details?.jersey_issued : !r.details?.jersey_issued)).filter(r => !['Jersey Distribution', 'Audience T-shirts'].includes(filter) || shirtSizeFilter === 'All sizes' || r.details?.['t-shirt_size'] === shirtSizeFilter).filter(r => [r.name, r.phone, r.details?.flat_no, r.apartment, r.details?.wing, r.details?.['t-shirt_name'], r.details?.['t-shirt_number'], r.details?.['t-shirt_size'], r.details?.team_name].some(v => String(v || '').toLowerCase().includes(adminSearch.trim().toLowerCase())));
  const shown = [...filteredRows].sort((a, b) => {
    const val = r => sortConfig.key === 'name' ? r.name : sortConfig.key === 'date' ? r.created_at : sortConfig.key === 'category' ? r.details?.player_category : sortConfig.key === 'payment' ? r.payment_status : sortConfig.key === 'team' ? r.details?.team_name : '';
    const x = String(val(a) || '').toLowerCase(), y = String(val(b) || '').toLowerCase();
    return (x < y ? -1 : x > y ? 1 : 0) * (sortConfig.direction === 'asc' ? 1 : -1);
  });
  const playerRows = rows.filter(r => r.type === 'Player');
  const categoryPayments = ['Men', 'Women', 'Kids'].map(category => ({ category, count: playerRows.filter(r => String(r.details?.player_category || '').toLowerCase() === category.toLowerCase()).length, paid: playerRows.filter(r => String(r.details?.player_category || '').toLowerCase() === category.toLowerCase() && r.payment_status === 'Paid').length, pending: playerRows.filter(r => String(r.details?.player_category || '').toLowerCase() === category.toLowerCase() && r.payment_status !== 'Paid') }));
  const rosterCounts = teams.map(team => ({ ...team, count: playerRows.filter(r => r.details?.team_name === team.name).length }));
  const unassignedCount = playerRows.filter(r => !r.details?.team_name).length;
  const jerseyRows = rows.filter(r => ['Player', 'Owner', 'Audience'].includes(r.type));
  const jerseyIssuedCount = jerseyRows.filter(r => r.details?.jersey_issued).length;
  const audienceRows = rows.filter(r => r.type === 'Audience');
  const audienceSizeCounts = [...new Set(audienceRows.map(r => String(r.details?.['t-shirt_size'] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(size => ({ size, count: audienceRows.filter(r => String(r.details?.['t-shirt_size'] || '').trim() === size).length }));
  const jerseySizes = [...new Set(jerseyRows.map(r => String(r.details?.['t-shirt_size'] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const jerseySizeCounts = jerseySizes.map(size => ({ size, total: jerseyRows.filter(r => String(r.details?.['t-shirt_size'] || '').trim() === size).length, issued: jerseyRows.filter(r => String(r.details?.['t-shirt_size'] || '').trim() === size && r.details?.jersey_issued).length }));
  const teamCaptainFor = teamName => playerRows.find(r => r.details?.team_name === teamName && r.details?.is_team_captain);
  const assignCaptain = async (teamName, captainId) => {
    setNotice('');
    if (!online) {
      const updated = rows.map(r => r.type === 'Player' && r.details?.team_name === teamName ? { ...r, details: { ...(r.details || {}), is_team_captain: Boolean(captainId && r.id === captainId) } } : r);
      saveLocal(updated); setRows(updated);
      setRegisteredPlayers(current => current.map(player => player.team_name === teamName ? { ...player, is_team_captain: Boolean(captainId && player.id === captainId) } : player));
      return;
    }
    try {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ captain_team: teamName, captain_id: captainId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || 'Could not save the team captain.'); return; }
      await loadRows();
      const listResponse = await fetch('/api/players', { cache: 'no-store' });
      const listData = await listResponse.json();
      if (listResponse.ok) { setRegisteredPlayers(listData.players || []); setPlayersLoaded(true); }
    } catch { setNotice('Could not reach the registrations API. Captain was not updated.'); }
  };
  const toggleSort = key => setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const toggleSelect = id => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const assignSelected = async () => { const targets = rows.filter(r => selectedIds.includes(r.id) && r.type === 'Player'); if (!online) { const updated = rows.map(r => selectedIds.includes(r.id) && r.type === 'Player' ? { ...r, details: { ...(r.details || {}), team_name: bulkTeam || null, ...(r.details?.is_team_captain && bulkTeam !== r.details?.team_name ? { is_team_captain: false } : {}) } } : r); saveLocal(updated); setRows(updated); } else { for (const row of targets) await setTeamAssignment(row, bulkTeam); } setSelectedIds([]); setBulkTeam(''); };

  function openPublicPlayerList() {
    if (!playersVisible) {
      toggleRegisteredPlayers();
      window.setTimeout(() => document.getElementById('registered-player-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    } else {
      toggleRegisteredPlayers();
    }
  }

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
    e.preventDefault();
    const formNode = e.currentTarget;
    setFormBusy(true);
    setNotice('');
    setRegistrationSuccess(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 32000);
    try {
      const form = new FormData(formNode);
      const details = Object.fromEntries(modal.fields.map((f, i) => [f.toLowerCase().replaceAll(' ', '_'), form.get(`extra${i}`) || '']));
      if (modal.key === 'Player') {
        const age = Number(details.age);
        const category = details.player_category;
        const eligible = category === 'Kids' ? Number.isInteger(age) && age >= 8 && age <= 15 : ['Men', 'Women'].includes(category) && Number.isInteger(age) && age >= 16;
        if (!eligible) throw new Error(category === 'Kids' ? 'Kids category is for ages 8–15.' : 'Men and Women categories are for ages 16+.');
      }
      const wing = String(form.get('wing') || '').trim();
      const flatNo = String(form.get('flat_no') || '').trim();
      const paymentTransactionId = String(form.get('payment') || '').trim();
      const paymentTime = String(form.get('payment_time') || '').trim();
      const paymentReference = paymentTransactionId ? `${paymentTransactionId} / ${paymentTime}` : paymentTime;
      const payload = { type: modal.key, name: form.get('name'), phone: form.get('phone'), email: '', wing, flat_no: flatNo, apartment: `${wing} / ${flatNo}`, payment_reference: paymentReference, payment_time: paymentTime, details: { ...details, wing, flat_no: flatNo, ...(modal.key === 'Player' && playerPhoto ? { photo: playerPhoto } : {}) } };
      const response = await fetch('/api/registrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json(); const receiptData = { ...payload, id: result.id, created_at: result.created_at, payment_status: 'Pending' }; setReceipt(receiptData); setRegistrationSuccess(true); setNotice(modal.key === 'Audience' ? 'T-shirt order received! Payment is pending verification.' : `Registration received! Your ${modal.key.toLowerCase()} place is confirmed. Payment is pending verification.`);
        void refreshRegistrationCounts();
        if (online) void loadRows();
      } else if (import.meta.env.DEV && (response.status === 503 || response.status === 404 || !response.headers.get('content-type')?.includes('application/json'))) {
        const row = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString(), payment_status: 'Pending' };
        const updated = [row, ...readLocal()]; saveLocal(updated); setRows(updated); setReceipt(row); setRegistrationSuccess(true);
        setNotice('Registration saved on this device. Your confirmation receipt is ready to download.');
      } else {
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json().catch(() => ({})) : {};
        throw new Error(data.error || `Registration service failed (HTTP ${response.status}). No registration was saved. Please try again or contact the organisers.`);
      }
      formNode.reset();
    } catch (err) { setRegistrationSuccess(false); setNotice(err.name === 'AbortError' ? 'This is taking longer than expected. No confirmation was received. Please check with the organisers before submitting again.' : (err.message || 'Could not submit. Please try again.')); }
    finally { clearTimeout(timeout); setFormBusy(false); }
  }

  async function savePlayerProfile(event) {
    event.preventDefault(); if (!selectedPlayer) return;
    setProfileBusy(true);
    const form = new FormData(event.currentTarget);
    const player_profile = Object.fromEntries(['player_number','player_address','age','player_category','playing_role','experience','batting','bowling','matches','runs','wickets','team_name'].map(key => [key, String(form.get(key) || '').trim()]));
    if (selectedPlayer.photo) player_profile.photo = selectedPlayer.photo;
    try {
      const response = await fetch('/api/registrations', { method:'PATCH', headers:{'Content-Type':'application/json','x-admin-password':adminPass}, body:JSON.stringify({id:selectedPlayer.id,player_profile}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not save player profile.');
      setSelectedPlayer(null); await loadRows();
      const list = await fetch('/api/players',{cache:'no-store'}).then(r=>r.json()); setRegisteredPlayers(list.players || []); setPlayersLoaded(true);
    } catch (error) { setNotice(error.message); } finally { setProfileBusy(false); }
  }

  async function updateSelectedPlayerPhoto(file) {
    if (!file) return;
    try {
      const photo = await imageData(file);
      setSelectedPlayer(current => current ? { ...current, photo } : current);
    } catch (error) {
      setNotice(error.message || 'Could not optimize that photo. Please choose another image.');
    }
  }

  async function submitPlayerPhoto(event) {
    event.preventDefault(); if (!photoTarget || !photoUpload) return;
    setPhotoBusy(true); setPhotoNotice('');
    try {
      const response = await fetch('/api/players', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:photoTarget.id,phone:photoPhone,photo:photoUpload}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not upload your photo.');
      setPhotoNotice('Photo uploaded successfully.'); setPhotoTarget(null); setPhotoUpload(''); setPhotoPhone('');
      const refreshed = await fetch('/api/players',{cache:'no-store'}).then(r=>r.json()); setRegisteredPlayers(refreshed.players || []);
    } catch(error) { setPhotoNotice(error.message); } finally { setPhotoBusy(false); }
  }

  function downloadReceipt() {
    if (!receipt) return;
    const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const detailRows = Object.entries(receipt.details || {}).filter(([key, value]) => value && key !== 'wing' && key !== 'flat_no' && key !== 'team_name').map(([key, value]) => `<tr><th>${escapeHtml(key.replaceAll('_', ' '))}</th><td>${escapeHtml(value)}</td></tr>`).join('');
    const receiptHtml = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GNPL registration receipt</title><style>body{margin:0;padding:32px;background:#f3f5f7;color:#202a36;font:16px Arial,sans-serif}.receipt{max-width:680px;margin:auto;padding:34px;background:#fff;border:1px solid #dce3e8;border-radius:16px;box-shadow:0 12px 40px #17233414}.brand{color:#54205d;font-size:13px;font-weight:800;letter-spacing:.16em}.title{margin:24px 0 6px;font-size:30px}.sub{color:#637182;line-height:1.6}.status{display:inline-block;margin:12px 0;padding:8px 12px;border-radius:30px;background:#fff2d5;color:#825400;font-size:12px;font-weight:700}table{width:100%;margin-top:18px;border-collapse:collapse}th,td{padding:12px 8px;border-bottom:1px solid #e7ebef;text-align:left;vertical-align:top}th{width:38%;color:#697789;text-transform:capitalize;font-size:13px}td{font-weight:700;overflow-wrap:anywhere}.foot{margin-top:24px;color:#657285;font-size:13px;line-height:1.6}@media print{body{padding:0;background:#fff}.receipt{box-shadow:none;border:0}}</style><main class="receipt"><div class="brand">GODREJ NEST PREMIER LEAGUE / 2026</div><h1 class="title">Registration received</h1><p class="sub">Keep this receipt for your GNPL registration records.</p><div class="status">Payment pending organiser verification</div><table><tbody><tr><th>Registration ID</th><td>${escapeHtml(receipt.id)}</td></tr><tr><th>Registration type</th><td>${escapeHtml(receipt.type)}</td></tr><tr><th>Name</th><td>${escapeHtml(receipt.name)}</td></tr><tr><th>Mobile</th><td>${escapeHtml(receipt.phone)}</td></tr><tr><th>Wing / flat</th><td>${escapeHtml(receipt.wing)} / ${escapeHtml(receipt.flat_no)}</td></tr><tr><th>Payment time</th><td>${escapeHtml(receipt.payment_time || receipt.payment_reference)}</td></tr>${detailRows}<tr><th>Submitted</th><td>${escapeHtml(new Date(receipt.created_at).toLocaleString('en-IN'))}</td></tr></tbody></table><p class="foot">Thank you for joining GNPL 2026. For questions, contact the Godrej Nest Cultural Team.</p></main></html>`;
    const url = URL.createObjectURL(new Blob([receiptHtml], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `gnpl-registration-${receipt.id || 'receipt'}.html`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openAdmin() {
    setMenuOpen(false);
    setAdmin(true); setLocalAdmin(false); setNotice('');
    const pass = sessionStorage.getItem('gnpl_admin') || ''; setAdminPass(pass);
    if (pass) {
      const result = await loadRows(pass);
      if (result.ok) return;
      sessionStorage.removeItem('gnpl_admin');
      setAdminPass('');
      setOnline(false);
      setNotice(result.message);
    }
  }
  async function signIn(e) {
    e.preventDefault(); setNotice(''); const p = new FormData(e.currentTarget).get('password');
    const result = await loadRows(p);
    if (result.ok) { setAdminPass(p); sessionStorage.setItem('gnpl_admin', p); setAdmin(true); setLocalAdmin(false); }
    else { setOnline(false); setNotice(result.message); }
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
  const toggleJerseyIssued = async row => {
    if (!['Player', 'Owner', 'Audience'].includes(row.type)) return;
    const issued = !row.details?.jersey_issued;
    const issuedAt = issued ? new Date().toISOString() : null;
    setNotice('');
    if (!online) {
      const updated = rows.map(r => r.id === row.id ? { ...r, details: { ...(r.details || {}), jersey_issued: issued, jersey_issued_at: issuedAt } } : r);
      saveLocal(updated); setRows(updated); return;
    }
    try {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: row.id, jersey_issued: issued }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || 'Could not update jersey distribution.'); return; }
      await loadRows();
    } catch { setNotice('Could not reach the registrations API. Jersey status was not updated.'); }
  };
  async function setTeamAssignment(row, teamName) {
    if (row.type !== 'Player') return;
    setNotice('');
    if (!online) {
      const updated = rows.map(item => item.id === row.id ? { ...item, details: { ...(item.details || {}), team_name: teamName || null, ...(item.details?.is_team_captain && teamName !== item.details?.team_name ? { is_team_captain: false } : {}) } } : item);
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

  async function saveRegistrationEdit(event) {
    event.preventDefault();
    if (!editTarget) return;
    setEditBusy(true);
    const form = new FormData(event.currentTarget);
    const details = Object.fromEntries(Object.keys(editTarget.details || {}).map(key => [key, String(form.get(`detail:${key}`) ?? '')]));
    const edit_registration = {
      name: String(form.get('name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      email: String(form.get('email') || '').trim(),
      payment_reference: String(form.get('payment_reference') || '').trim(),
      payment_status: String(form.get('payment_status') || 'Pending'),
      details,
    };
    try {
      if (localAdmin) {
        const updated = rows.map(row => row.id === editTarget.id ? { ...row, ...edit_registration, apartment: `${details.wing || ''} / ${details.flat_no || ''}`, details: { ...row.details, ...details } } : row);
        saveLocal(updated); setRows(updated);
      } else {
        const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: editTarget.id, edit_registration }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not update registration.');
        await loadRows();
        if (editTarget.type === 'Player') {
          const playersResponse = await fetch('/api/players', { cache: 'no-store' });
          if (playersResponse.ok) { const playerData = await playersResponse.json(); setRegisteredPlayers(playerData.players || []); }
        }
      }
      setEditTarget(null);
      setNotice('Registration details updated.');
    } catch (error) {
      setNotice(error.message || 'Could not update registration.');
    } finally {
      setEditBusy(false);
    }
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
  const exportRows = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(shown)], { type: 'text/csv;charset=utf-8' })); a.download = `gnpl-2026-${filter.toLowerCase()}-${teamFilter.toLowerCase().replaceAll(' ', '-')}-registrations.csv`;  a.click(); URL.revokeObjectURL(a.href); };
  const exportJerseyDistribution = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(jerseyRows)], { type: 'text/csv;charset=utf-8' })); a.download = 'gnpl-2026-jersey-distribution.csv'; a.click(); URL.revokeObjectURL(a.href); };
  const printTeamSheets = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { setNotice('Allow pop-ups to print team sheets.'); return; }
    const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const teamSections = teams.map((team, index) => {
      const squad = rows.filter(row => row.type === 'Player' && row.details?.team_name === team.name);
      const captain = squad.find(row => row.details?.is_team_captain);
      const body = squad.length ? squad.map(player => `<tr><td>${escapeHtml(player.name)}</td><td>${escapeHtml(player.details?.player_category || '-')}</td><td>${escapeHtml(player.details?.playing_role || '-')}</td><td>${escapeHtml(player.details?.['t-shirt_size'] || '-')}</td><td>${escapeHtml(player.details?.['t-shirt_number'] || '-')}</td><td>${player.details?.jersey_issued ? `Issued${player.details?.jersey_issued_at ? ` - ${escapeHtml(new Date(player.details.jersey_issued_at).toLocaleDateString('en-IN'))}` : ''}` : 'Not issued'}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">No players assigned to this team.</td></tr>';
      return `<section class="team-sheet"><header><div class="eyebrow">GNPL 2026 / TEAM ${String(index + 1).padStart(2, '0')}</div><h1>${escapeHtml(team.name)}</h1><p>Captain: <strong>${escapeHtml(captain?.name || 'To be announced')}</strong> <span>-</span> ${squad.length} players</p></header><table><thead><tr><th>Player</th><th>Category</th><th>Role</th><th>T-shirt size</th><th>Number</th><th>Jersey status</th></tr></thead><tbody>${body}</tbody></table></section>`;
    }).join('');
    printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNPL 2026 Team Sheets</title><style>body{margin:0;padding:24px;color:#19151d;font:14px Arial,sans-serif}.team-sheet{max-width:1100px;margin:0 auto 30px;padding:20px 0 28px;break-after:page}.team-sheet:last-child{break-after:auto}header{border-bottom:3px solid #15111d;margin-bottom:20px;padding-bottom:12px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;color:#70435e}h1{margin:8px 0;font-size:34px}header p{margin:0;color:#453c47}table{width:100%;border-collapse:collapse}th,td{padding:10px 9px;border:1px solid #d8d3dc;text-align:left}th{background:#f0edf3;font-size:11px;text-transform:uppercase;letter-spacing:.06em}td{font-size:13px}.empty{text-align:center;color:#746b77}@media print{body{padding:0}.team-sheet{margin:0;padding:12mm 8mm;min-height:250mm}.team-sheet:last-child{break-after:auto}}@media(max-width:650px){body{padding:12px}.team-sheet{overflow:auto}table{min-width:650px}}</style></head><body>${teamSections}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`);
    printWindow.document.close(); printWindow.focus();
  };


  return <div className="site-shell">
    <div className="topline"><span><Radio size={13} className="live-dot" /> COMMUNITY CRICKET. BIG MATCH ENERGY.</span><span className="topline-right">AN INITIATIVE BY GODREJ NEST CULTURAL TEAM</span></div>
    <header className="nav wrap"><a href="#home" className="brand"><img src="/nest-sanskriti-logo.png" alt="Nest Sanskriti Mandal" className="brand-logo" /><span className="brand-copy">GN<span className="brand-accent">PL</span><small>GODREJ NEST PREMIER LEAGUE</small></span></a><div className="header-cricket" aria-hidden="true"><svg viewBox="0 0 360 126" role="presentation"><ellipse className="header-orbit" cx="182" cy="73" rx="154" ry="45"/><ellipse className="header-pitch" cx="187" cy="94" rx="102" ry="19"/><path className="header-pitch-line" d="M118 92h138"/><g className="header-bowler"><circle cx="57" cy="38" r="9"/><path d="M55 49 48 72l17 4 7-24m-12 2L43 39m15 12 12-14m-7 25L48 91m19-15 9 16"/></g><g className="header-batter"><circle cx="184" cy="30" r="10"/><path d="m180 41-11 26 18 8 11-25m-20 2-18 12m29-11 12 12m-22 7-12 24m20-22 15 21"/><g className="header-bat"><path d="M0 0 33-39"/><path d="m25-48 14 10-6 8-14-10z"/></g></g><g className="header-wickets"><path d="M279 75V43m8 32V40m8 35V43m-17 0h20"/></g><g className="header-ball"><circle cx="104" cy="59" r="5"/><path d="M101 56q5 2 6 6"/></g><text className="header-six" x="247" y="31">SIX!</text></svg></div><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button><nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#league" onClick={() => setMenuOpen(false)}>The league</a><a href="#teams" onClick={() => setMenuOpen(false)}>Teams</a><a href="#register" onClick={() => setMenuOpen(false)}>Register</a><a href="#schedule" onClick={() => setMenuOpen(false)}>Match day</a><a href="#announcements" onClick={() => setMenuOpen(false)}>Updates</a><button className="nav-admin" onClick={openAdmin}>Admin <ArrowUpRight size={15} /></button></nav></header>

    <main>
      <section className="hero wrap" id="home">
        <div className="hero-grain" />
        <div className="hero-copy"><div className="organizer-banner">AN INITIATIVE BY <strong>GODREJ NEST CULTURAL TEAM</strong></div><div className="eyebrow"><span className="eyebrow-line" /> THE NEIGHBOURHOOD LEAGUE IS BACK</div><h1 className="league-title"><span>GODREJ NEST</span><br /><span className="league-title-second">PREMIER LEAGUE</span> <em>2026</em></h1><p className="hero-tagline">Josh Bhi Junoon Bhi</p><p className="hero-text">Never held a bat? This is your time to start. GNPL welcomes beginners and seasoned players for a weekend of cricket, friends, and big cheers.</p><div className="hero-actions"><a className="button button-lime" href="#register">Register now <ArrowRight size={17} /></a><a className="tshirt-buy-shortcut" href="#venue-shirt"><span className="tshirt-shortcut-icon"><Shirt size={17} /></span><span><strong>Audience T-Shirt Buy Now</strong><small>Click here to view the jersey</small></span><ArrowUpRight size={14} /></a><a className="text-link" href="#league">Meet the league <ArrowDown size={15} /></a><button type="button" className={`hero-player-list-button${playersVisible ? ' active' : ''}`} aria-expanded={playersVisible} aria-controls="registered-player-panel" onClick={openPublicPlayerList}><Users size={16} /> {playersVisible ? 'Hide player list' : 'Players & payment status'}</button><button className="share-league-button" onClick={shareLeague}><Share2 size={15} /> Share league</button></div>{shareNotice && <p className="share-notice" role="status">{shareNotice}</p>}<div className="hero-invite"><span className="hero-invite-tag">THE LEAGUE IS FOR EVERYONE</span><strong>Play. Cheer. Celebrate.</strong><div className="hero-event-meta"><span><small>MATCH DATES</small><strong>12 & 13 DECEMBER 2026</strong></span><span><small>VENUE</small><strong>KANDIVALI TURF ZONE</strong></span></div><small>Gents, ladies, senior citizens and children are welcome.</small><small>Never held a bat? You are welcome here. Refreshments and a player T-shirt will be provided.</small><div className="venue-perks"><span className="floating-perk refreshments-perk"><span className="snack-drink-icons"><span className="perk-icon-float snack-icon-float" aria-label="Snacks"><Cookie size={17} /></span><span className="perk-icon-float drink-icon-float" aria-label="Healthy drinks"><GlassWater size={17} /></span></span><span>Snacks &amp; healthy drinks</span></span><span className="shirt-perk floating-perk"><span className="perk-icon-float shirt-icon-float"><Shirt size={19} /></span><span>T-shirt provided to every player</span></span></div></div><div className="hero-proof"><div className="avatar-stack"><b>🏏</b><b>🧢</b><b>🙌</b><b>+</b></div><span>Players, owners & fans<br /><strong>all under one roof</strong></span></div></div>
        
        <div className="scroll-cue"><span /> SCROLL TO EXPLORE</div>
      </section>

      <section className="venue-overview wrap" id="venue"><div className="section-tag">GNPL 2026 / VENUE OVERVIEW</div><div className="venue-overview-card"><div><span className="venue-kicker"><MapPin size={15}/> MATCH VENUE</span><h2>Kandivali <em>Turf Zone</em></h2><p>00 Gopinath Munde Ground, Near Sapphire Heights, Lokhandwala Foundation School, Akurli Road, Lokhandwala Complex, Kandivali East, Mumbai - 400101</p><a href="https://www.google.com/maps/search/?api=1&query=Kandivali+Turf+Zone+Gopinath+Munde+Ground+Kandivali+East" target="_blank" rel="noreferrer">Open venue in Google Maps <ArrowUpRight size={15}/></a><div className="venue-pricing"><span><strong>Men</strong> Rs 600</span><span><strong>Women</strong> Rs 400</span><span><strong>Kids</strong> Rs 300</span></div><small>Player T-shirt and refreshments included.</small></div><div className="shirt-showcase official-jersey-showcase" id="venue-shirt"><img className="venue-jersey-mockup" src="/gnpl-audience-jersey.png" alt="Official GNPL 2026 jersey front and back design" /><div className="venue-jersey-details"><strong>OFFICIAL GNPL 2026 T-SHIRT</strong><span>Audience jersey · ₹300</span><button type="button" className="venue-jersey-buy" onClick={() => { const item = types.find(type => type.key === 'Audience'); setNotice(''); setReceipt(null); setFormReady(false); setRegistrationSuccess(false); setModal(item); }}>Buy now <ArrowUpRight size={15} /></button></div></div></div></section>
      
      <section className="register-section" id="register"><div className="wrap"><div className="section-tag">01 / REGISTER</div><div className="register-heading"><div><h2>HOW WILL<br /><em>YOU PLAY?</em></h2></div><p>Players and team owners: take your place in the league.<br />Choose a registration and get ready for match day.</p></div><div className="register-grid">{types.map((t, i) => <article className={`register-card card-${i}`} key={t.key}><div className="card-top"><span className="card-number">0{i + 1} / GNPL</span><span className="card-emoji">{t.icon}</span></div><div className="role-art" aria-hidden="true">{i === 0 ? <><div className="role-player"><span className="player-helmet" /><span className="player-body" /><span className="player-bat" /></div><span className="role-ball" /></> : i === 1 ? <><span className="owner-jersey jersey-one" /><span className="owner-jersey jersey-two" /><span className="owner-trophy"><Trophy size={26} /></span></> : <><span className="audience-rings" /><Users size={34} /><span className="cheer-stars">✦ ✦ ✦</span></>}</div><h3>{t.title}</h3><p className="register-tagline">{t.tagline}</p><p>{t.desc}</p><div className="deadline-badge"><span className="deadline-pulse" aria-hidden="true" />{Math.ceil((new Date(t.deadline).getTime() - clockNow) / 86400000) > 0 ? `${Math.ceil((new Date(t.deadline).getTime() - clockNow) / 86400000)} DAYS LEFT` : (t.key === 'Audience' ? 'ORDERS CLOSED' : 'REGISTRATION CLOSED')}<strong>{t.key === 'Owner' ? 'CLOSES 8 NOVEMBER' : t.key === 'Audience' ? 'ORDERS CLOSE 29 NOVEMBER' : 'CLOSES 15 NOVEMBER'}</strong></div><div className="card-bottom">{t.key === "Player" ? <div className="player-fees-box" aria-label="Player registration charges"><div className="player-fees-heading"><span>PLAYER REGISTRATION</span><span>FEE</span></div><div className="player-fee-row"><span>Men <small>16+</small></span><strong>₹600</strong></div><div className="player-fee-row"><span>Women <small>16+</small></span><strong>₹400</strong></div><div className="player-fee-row"><span>Kids <small>8–15</small></span><strong>₹300</strong></div><div className="player-fees-note">T-shirt included</div></div> : <span className="entry-fee">{t.fee}</span>}<button onClick={() => { setNotice(''); setReceipt(null); setFormReady(false); setPlayerPhoto(''); setRegistrationSuccess(false); setPhotoError(''); setModal(t); }}>{t.key === 'Audience' ? 'Buy now' : 'Choose your spot'} <ArrowUpRight size={16} /></button></div></article>)}</div><div className="community-scene"><div className="scene-heading"><span className="scene-kicker">THE WHOLE NEST, IN ONE GAME</span><h3>PLAYERS TAKE THE FIELD.<br /><em>NEIGHBOURS CHEER THEM ON.</em></h3></div><svg className="community-scene-art" viewBox="0 0 1100 410" role="img" aria-label="Cricket players batting and bowling while neighbours cheer from the stands"><defs><linearGradient id="scene-sky" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#41123b"/><stop offset="1" stopColor="#10283b"/></linearGradient><linearGradient id="scene-grass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#295c39"/><stop offset="1" stopColor="#0e2c22"/></linearGradient><linearGradient id="scene-jersey" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8ff83"/><stop offset="1" stopColor="#74c950"/></linearGradient></defs><rect width="1100" height="410" rx="18" fill="url(#scene-sky)"/><path d="M0 22Q550 155 1100 22V210H0Z" fill="#221332"/><path d="M28 45Q550 158 1072 45" fill="none" stroke="#ff6cb5" strokeOpacity=".5" strokeWidth="3"/><path d="M60 72Q550 175 1040 72" fill="none" stroke="#58e5ec" strokeOpacity=".4" strokeWidth="2"/><g className="scene-crowd" fill="#ffd166" stroke="#ffb6d5" strokeWidth="3"><g transform="translate(105 110)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(195 132) scale(.85)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(285 147) scale(.72)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(895 147) scale(.72)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g><g transform="translate(985 132) scale(.85)"><circle cy="0" r="10"/><path d="M0 12v32m0-23-18-21m18 21 18-20m-18 43-14 18m14-18 14 18"/></g></g><path d="M0 235Q550 185 1100 235V410H0Z" fill="url(#scene-grass)"/><ellipse cx="550" cy="325" rx="390" ry="90" fill="none" stroke="#b8ed84" strokeOpacity=".6" strokeWidth="2"/><path d="M495 270h110v90H495z" fill="#bd9a64" fillOpacity=".5"/><path d="M510 284v48m12-48v48m56-48v48m12-48v48" stroke="#fff1c8" strokeWidth="4"/><g className="scene-batter"><circle cx="536" cy="184" r="23" fill="#c98757"/><path d="M514 179q20-31 46-4v10h-46z" fill="#17251b"/><path d="m514 212-30 92h92l-24-92q-19-14-38 0" fill="url(#scene-jersey)"/><path d="m512 225-43 61m87-60 28 55" stroke="#c98757" strokeWidth="19" strokeLinecap="round"/><path d="m523 301-20 82m41-82 26 78" stroke="#e6b082" strokeWidth="23" strokeLinecap="round"/><path d="m490 386 30-5m37 3 31-8" stroke="#111d19" strokeWidth="17" strokeLinecap="round"/><path d="m574 280 74-110" stroke="#e8c58b" strokeWidth="13" strokeLinecap="round"/><path d="m646 174 8-12 9 7-8 12z" fill="#fff0c8"/></g><g className="scene-bowler"><circle cx="315" cy="224" r="16" fill="#b97854"/><path d="M300 220q15-21 31-2v7h-31z" fill="#1c2920"/><path d="m300 244-19 62h62l-13-62q-15-10-30 0" fill="#ff5aa7"/><path d="m302 251-36 31m49-34 35-19" stroke="#b97854" strokeWidth="12" strokeLinecap="round"/><path d="m300 303-10 56m29-56 13 54" stroke="#c98757" strokeWidth="15" strokeLinecap="round"/><path d="m282 361 22-3m22 1 22-2" stroke="#111d19" strokeWidth="13" strokeLinecap="round"/></g><circle className="scene-ball" cx="377" cy="233" r="9" fill="#ff5b69"/><path d="M372 229q8 1 10 8" fill="none" stroke="#fff" strokeWidth="1.5"/><g fill="#d7ff59"><path d="m790 98 5 13 13 5-13 5-5 13-5-13-13-5 13-5z"/><path d="m410 119 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></g></svg><div className="scene-foot"><span><strong>PLAY</strong> with pride</span><span><strong>CHEER</strong> for your neighbours</span><span><strong>CELEBRATE</strong> together</span></div></div><p className="fee-note"><ShieldCheck size={14} /> Player entry: men ₹600, women ₹400, kids ₹300. A T-shirt is included. Owner registration is &#8377;10,000 minimum and closes 8 November. Two owners are registered so far.</p><div className="tournament-invite"><span className="invite-ball" aria-hidden="true" /><div><strong>Everyone is invited to play, cheer and celebrate!</strong><p>Gents, ladies, senior citizens and children are welcome. Refreshments and player T-shirts will be provided. Player auction: 29 November. Matches: 12&#8211;13 December 2026!</p></div><span className="invite-ball invite-ball-two" aria-hidden="true" /></div><div className="registration-faq" id="faq"><div className="section-tag">QUICK ANSWERS</div><h3>GOOD TO <em>KNOW.</em></h3><details><summary>When do registrations close?</summary><p>Owner registrations close on 8 November. Player registrations close on 15 November 2026.</p></details><details><summary>What payment information should I enter?</summary><p>Enter your Google Pay payment time so the organisers can identify your payment and notify you. The transaction ID is optional.</p></details><details><summary>When will teams and player squads be announced?</summary><p>Team allocations and player squads will be announced after owner and player registrations are reviewed.</p></details></div></div></section>

      <section className="announcements-section wrap" id="announcements"><div className="section-tag"><Megaphone size={15} /> GNPL 2026 / PUBLIC UPDATES</div><div className="public-section-heading"><div><h2>THE LATEST <em>FROM THE NEST.</em></h2><p>Key dates and league news in one place.</p></div></div><div className="announcement-grid"><article className="announcement-card announcement-next"><span className="announcement-label">OWNER REGISTRATION</span><strong>Owner spots close 8 November</strong><p>Register as a team owner before the deadline. Owners will build their squads at the player auction.</p></article><article className="announcement-card"><span className="announcement-label">PLAYER REGISTRATION</span><strong>Player spots close 15 November</strong><p>Players of all experience levels are welcome. Kids aged 8–15 and adults 16+ can register.</p></article><article className="announcement-card"><span className="announcement-label">PLAYER AUCTION</span><strong>29 November 2026</strong><p>Registered owners will bid for players and form their teams.</p></article><article className="announcement-card"><span className="announcement-label">MATCH WEEKEND</span><strong>12–13 December 2026</strong><p>Two days of community cricket at Kandivali Turf Zone.</p><a href="#venue">Venue details <ArrowRight size={14} /></a></article></div></section>
      <section className="gallery-section wrap" id="gallery"><div className="section-tag"><Camera size={15} /> GNPL 2026 / MOMENTS</div><div className="public-section-heading"><div><h2>THE <em>GALLERY.</em></h2><p>Match day memories, shared with the neighbourhood.</p></div></div><div className="gallery-empty"><span><Camera size={30} /></span><div><strong>Photos will be added after match day</strong><p>Check back after 12–13 December for highlights from the league.</p></div></div></section>
      <section className="ticker" aria-label="Tournament highlights"><div className="ticker-track">{Array.from({ length: 2 }, (_, i) => <span key={i}>COMMUNITY FIRST <b>✳</b> CRICKET ALWAYS <b>✳</b> GOOD TIMES GUARANTEED <b>✳</b> GNPL 2026 <b>✳</b> COMMUNITY FIRST <b>✳</b> CRICKET ALWAYS <b>✳</b> GOOD TIMES GUARANTEED <b>✳</b></span>)}</div></section>

      <section className="intro-section wrap" id="league"><div className="section-tag">02 / THE LEAGUE</div><div className="intro-grid"><h2>MORE THAN<br />A <em>MATCH.</em></h2><div className="intro-copy"><p>It’s the neighbour who bowls a mean yorker. The family in the front row. The team that starts as strangers and ends as friends.</p><p>Godrej Nest Premier League brings every tower and every neighbour together through cricket. Arranged by Godrej Nest Cultural Team.</p><a href="#register" className="underlink">Find your place in the league <ArrowRight size={15} /></a></div></div><div className="stat-row"><div><strong>02</strong><span>WAYS TO JOIN</span></div><div><strong>01</strong><span>COMMUNITY</span></div><div><strong>∞</strong><span>MEMORIES TO MAKE</span></div><div className="stat-note"><span className="live-dot" /> REGISTRATION IS OPEN</div></div><div className="live-board"><div className="live-board-head"><div><span className="live-dot" /> LIVE LEAGUE BOARD</div><span className="live-refresh">Live · updates every 5 seconds</span></div><div className="live-board-grid"><div className="live-total"><small>TOTAL REGISTRATIONS</small><strong key={registrationCounts?.total ?? 'total-loading'}>{registrationCounts ? registrationCounts.total : '—'}</strong><span>THE NEST IS FILLING UP</span></div><button type="button" className={`live-count player-count-toggle${playersVisible ? ' active' : ''}`} aria-expanded={playersVisible} aria-controls="registered-player-panel" onClick={toggleRegisteredPlayers}><small>PLAYERS</small><strong key={registrationCounts?.players ?? 'players-loading'}>{registrationCounts ? registrationCounts.players : '\u2014'}</strong><span>{playersVisible ? 'CLICK TO HIDE NAMES' : 'CLICK TO VIEW PLAYER NAMES'}</span></button><div className="live-count"><small>TEAM OWNERS</small><strong key={registrationCounts?.owners ?? 'owners-loading'}>{registrationCounts ? registrationCounts.owners : '—'}</strong><span>BUILDING THEIR TEAMS</span></div></div><button type="button" className={`public-roster-button${playersVisible ? ' active' : ''}`} aria-expanded={playersVisible} aria-controls="registered-player-panel" onClick={toggleRegisteredPlayers}><Users size={17} />{playersVisible ? "Hide player list" : "View player list & payment status"}<ArrowRight size={16} /></button></div>{playersVisible && <div className="registered-player-panel live-player-panel" id="registered-player-panel" aria-live="polite">{playersLoading ? <p>Loading registered players...</p> : playersError ? <p>{playersError}</p> : registeredPlayers.length ? <><div className="player-panel-heading">REGISTERED PLAYERS <span>{registeredPlayers.length}</span></div><div className="public-player-list-head"><strong>PLAYER</strong><strong>PAYMENT STATUS</strong></div><ul>{registeredPlayers.map((player, index) => <li key={`${player.name}-${index}`}><div className="public-player-link">{player.photo ? <img className="player-avatar" src={player.photo} alt={player.name} /> : <span className="player-avatar player-avatar-empty" aria-label="Image not updated" />}<span className="player-name-stack"><strong>{player.name}</strong><small className={player.team_name ? "player-team-badge" : "player-team-unassigned"}>{player.team_name ? `Team: ${player.team_name}` : "Team not assigned yet"}</small>{!player.photo && <small>Image not updated</small>}</span></div><span className="public-player-meta">{player.role && <small className="player-role-badge">{player.role}</small>}<span className="public-payment-cell"><small>PAYMENT STATUS</small><span className={`public-payment ${player.payment_status === "Paid" ? "paid" : "pending"}`}>{player.payment_status === "Paid" ? "Paid" : "Pending"}</span></span>{!player.photo && <button className="upload-player-photo" onClick={() => { setPhotoTarget(player); setPhotoNotice(""); }}>Upload image</button>}</span></li>)}</ul></> : <p>No player registrations yet. Registered player names will appear here.</p>}<small>Names are shown publicly; contact and payment details stay private.</small></div>}</section>

      <section className="teams-section wrap" id="teams">
        <div className="section-tag">03 / MEET THE TEAMS</div>
        <div className="teams-heading"><h2>THE SQUADS.<br /><em>THE PRIDE.</em></h2><p>Eight proposed teams. Final team allocations and player squads will follow owner and player registrations; team and squad details are yet to be announced.</p></div>
        <div className="teams-grid">{teams.map((team, index) => {
          const squad = registeredPlayers.filter(player => player.team_name === team.name);
          const captainName = squad.find(player => player.is_team_captain)?.name || team.captain;
          return <article className="team-card team-card-clickable" key={team.name} style={{'--team-accent': team.color}} role="button" tabIndex={0} aria-label={`View ${team.name} team roster`} onClick={() => setSelectedTeam(team)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTeam(team); } }}>
            <div className="team-card-top"><span>GNPL 2026 / TEAM {String(index + 1).padStart(2, '0')}</span><span className="team-status">{squad.length ? 'SQUAD CONFIRMED' : 'TO BE ANNOUNCED'}</span></div>
            <div className="team-identity"><div className="team-logo" aria-label={`${team.name} logo`}><span>{team.short}</span><small>GNPL</small></div><div><h3>{team.name}</h3><p><Trophy size={14} /> Captain: <strong>{captainName}</strong></p></div></div>
            <div className="squad-heading"><span><Users size={15} /> PLAYER SQUAD</span><strong>{squad.length ? `${squad.length} PLAYERS` : 'TO BE ANNOUNCED'}</strong></div>
            {squad.length ? <ul className="squad-list">{squad.map((player, playerIndex) => <li key={`${player.name}-${playerIndex}`}><span>{player.name}</span>{player.role && <small className="player-role-badge">{player.role}</small>}</li>)}</ul> : <div className="squad-empty"><span className="squad-people"><i/><i/><i/><i/></span><p>Player names will appear here after team assignments are finalized.</p></div>}
          </article>;
        })}</div>
      </section>



      <section className="matchday wrap" id="schedule"><div className="matchday-left"><div className="section-tag">04 / SAVE THE FEELING</div><h2>THE CROWD.<br /><em>THE CRACK.</em><br />THE CHEER.</h2><p>One boundary can bring the whole neighbourhood to its feet. Get ready for a season worth showing up for.</p><a href="#register" className="button button-lime">Count me in <ArrowRight size={17} /></a></div></section>
    </main>

    <footer className="footer"><div className="wrap footer-main"><a href="#home" className="brand"><span className="brand-mark"><Trophy size={21} /></span><span>GN<span className="brand-accent">PL</span><small>GODREJ NEST PREMIER LEAGUE</small></span></a><p>Arranged by<br /><strong>Godrej Nest Cultural Team</strong></p><a className="footer-top" href="#home">BACK TO TOP ↑</a></div><div className="wrap footer-bottom"><span>© 2026 GNPL · GODREJ NEST PREMIER LEAGUE</span><button onClick={openAdmin}>Registration dashboard</button><span className="footer-credit"><small>WEBSITE CRAFTED BY</small><strong>Abhishek Hemant Sawant <em>(Mindhacker)</em></strong></span><span>PLAY WITH PRIDE <span className="lime">✳</span></span></div></footer>

    {modal && <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="dialog register-dialog" role="dialog" aria-modal="true" aria-labelledby="reg-title"><button className="close" onClick={() => setModal(null)} aria-label="Close"><X /></button><div className="dialog-icon">{modal.icon}</div><div className="section-tag">GNPL 2026 / {modal.key.toUpperCase()}</div><h2 id="reg-title">Your place<br /><em>starts here.</em></h2><p className="modal-entry-fee">{modal.key === 'Audience' ? 'Audience T-shirt price:' : 'Registration fee:'} <strong>{modal.fee}</strong></p>{notice ? <div className={registrationSuccess ? "success-state" : "success-state error-state"}><span className="success-icon">{registrationSuccess ? <Check /> : <X />}</span><p>{notice}</p>{receipt && <div className="receipt-preview"><strong>Registration ID</strong><span>{receipt.id}</span><small>{receipt.name} ? {receipt.type} registration ? Payment pending verification</small><button type="button" className="receipt-download" onClick={downloadReceipt}><Download size={15} /> Download registration receipt</button></div>}<button className="button button-lime" onClick={() => { setModal(null); setNotice(''); }}>Done <ArrowRight size={16} /></button></div> : <form className="registration-form" onSubmit={submitRegistration} onBlur={e => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) { e.target.dataset.touched = "true"; syncFieldError(e.target); } }} onInput={e => { setFormReady(e.currentTarget.checkValidity()); if (e.target.dataset.touched) syncFieldError(e.target); }}><a className="payment-qr-link" href="/payment-qr.jpeg" target="_blank" rel="noreferrer"><img src="/payment-qr.jpeg" alt="Scan this QR code to pay Abhishek Sawant by UPI" /><span>Scan to pay with any UPI app ? tap to open QR</span></a><div className="form-grid"><label>Full name<input name="name" required placeholder="Your name" autoComplete="name" /><small className="field-error" hidden></small></label><label>Mobile number<input name="phone" required inputMode="tel" placeholder="+91 00000 00000" autoComplete="tel" pattern="[+0-9\x20\x28\x29\x2d]{7,20}" /><small className="field-error" hidden></small></label><label>Wing<input name="wing" required placeholder="e.g. A Wing" /><small className="field-error" hidden></small></label><label>Flat No.<input name="flat_no" required placeholder="e.g. 1204" /><small className="field-error" hidden></small></label>{modal.fields.map((f, i) => <label key={f}>{f}{f === "Playing role" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose your role</option><option value="Bowler">Bowler</option><option value="Batter">Batter</option></select> : f === "T-shirt Size" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose T-shirt size</option>{["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map(size => <option key={size} value={size}>{size}</option>)}</select> : f === "T-Shirt Number" ? <input name={`extra${i}`} type="number" inputMode="numeric" min="0" max="999" required placeholder="Your T-shirt number" /> : f === "Player category" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose category</option><option value="Men">Men (16+) - &#8377;600</option><option value="Women">Women (16+) - &#8377;400</option><option value="Kids">Kids (8–15) - &#8377;300</option></select> : f === "Age" && modal.key === "Player" ? <><input name={`extra${i}`} type="number" inputMode="numeric" min="8" max="120" step="1" required placeholder="Your age" /><small className="field-hint">Kids: 8–15 years · Men and Women: 16+ years</small></> : <input name={`extra${i}`} required placeholder={`Your ${f.toLowerCase()}`} />}<small className="field-error" hidden></small></label>)}{modal.key === "Player" && <label className="full-field photo-upload">Player photo (required)<input type="file" accept="image/*" required onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setPhotoPreparing(true); setPhotoError(""); setNotice(""); try { setPlayerPhoto(await imageData(file)); } catch (error) { setPhotoError(error.message || "Could not optimize that photo. Please choose another image."); } finally { setPhotoPreparing(false); } }} />{playerPhoto && <img className="upload-preview" src={playerPhoto} alt="Player photo preview" />}<small className="field-hint photo-progress" aria-live="polite">{photoPreparing ? "Optimizing image for a faster upload..." : photoError || (playerPhoto ? "Photo optimized and ready to upload." : "Player photo is required. A clear headshot helps owners review your profile.")}</small></label>}<label className="full-field">Google Pay transaction ID (optional)<input name="payment" placeholder="Enter transaction ID if available" /><small className="field-error" hidden></small></label><label className="full-field">Google Pay payment time<input name="payment_time" type="time" step="60" required aria-label="Google Pay payment time" /><small className="field-error" hidden></small><small className="field-hint">Choose the exact time shown in your payment app (24-hour format). Transaction ID is optional.</small></label></div>{formBusy && <p className="submission-progress" role="status"><span className="progress-spinner" /> {modal.key === 'Audience' ? 'Submitting your T-shirt order. Please keep this page open.' : 'Sending registration and optimized photo. Please keep this page open.'}</p>}<button className="button button-lime submit-button" disabled={formBusy || photoPreparing || !formReady || (modal.key === 'Player' && !playerPhoto)}>{photoPreparing ? 'Preparing photo...' : formBusy ? 'Submitting...' : 'Submit registration'} <ArrowRight size={16} /></button><p className="form-privacy">{modal.key === 'Audience' ? 'Your order details stay private. Payment remains pending until verified.' : 'Your name will appear in the public GNPL player list. Your contact and payment details remain private; payment is marked pending until verified.'}</p></form>}</div></div>}

    {admin && createPortal(<AdminRenderBoundary><div className="overlay admin-overlay" role="presentation"><div className="dialog admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title"><button className="close" onClick={() => setAdmin(false)} aria-label="Close"><X /></button>{!online && !localAdmin ? <><div className="section-tag">ORGANISER ACCESS</div><h2 id="admin-title">Registration<br /><em>dashboard.</em></h2><form onSubmit={signIn} className="admin-login"><label>Admin password<input name="password" type="password" required autoComplete="current-password" placeholder="Enter dashboard password" /></label><button className="button button-lime">Open dashboard <ArrowRight size={16} /></button></form><button className="local-view" onClick={() => { setRows(normalizeRows(readLocal())); setLocalAdmin(true); }}>View registrations on this device ({readLocal().length})</button>{notice && <p className="notice">{notice}</p>}</> : <><div className="dashboard-head"><div><div className="section-tag">GNPL 2026 / {online ? 'LIVE DASHBOARD' : 'THIS DEVICE'}</div><h2 id="admin-title">The <em>line-up.</em></h2></div><div className="admin-export-actions"><button className="export-button" onClick={exportRows}><Download size={16} /> Export CSV</button><button className="export-button print-team-sheets-button" onClick={printTeamSheets}><Printer size={16} /> Print team sheets</button></div></div><div className="dash-stats"><button type="button" className={paymentFilter === 'All' ? 'active' : ''} aria-pressed={paymentFilter === 'All'} onClick={() => setPaymentFilter('All')}><span>TOTAL REGISTRATIONS</span><strong key={counts.total}>{counts.total}</strong></button><button type="button" className={paymentFilter === 'Paid' ? 'active' : ''} aria-pressed={paymentFilter === 'Paid'} onClick={() => setPaymentFilter('Paid')}><span>PAYMENTS CONFIRMED</span><strong key={counts.paid}>{counts.paid}</strong></button><button type="button" className={paymentFilter === 'Pending' ? 'active' : ''} aria-pressed={paymentFilter === 'Pending'} onClick={() => setPaymentFilter('Pending')}><span>PAYMENTS PENDING</span><strong key={counts.total - counts.paid}>{counts.total - counts.paid}</strong></button></div><div className="jersey-size-summary" aria-label="Jersey sizes to order"><div className="jersey-size-heading"><strong>Jersey sizes</strong><span>{jerseyRows.length - jerseyIssuedCount} still to issue</span><button className="export-button jersey-export-button" onClick={exportJerseyDistribution}><Download size={15} /> Export distribution</button></div><div className="jersey-size-list">{jerseySizeCounts.length ? jerseySizeCounts.map(item => <div key={item.size}><strong>{item.size}</strong><span>{item.total} total</span><small>{item.total - item.issued} still to issue</small></div>) : <p>No jersey sizes recorded yet.</p>}</div></div><div className="jersey-progress"><span>Jersey distribution</span><strong>{jerseyIssuedCount} of {jerseyRows.length} issued</strong><progress max={Math.max(jerseyRows.length, 1)} value={jerseyIssuedCount} aria-label={`${jerseyIssuedCount} of ${playerRows.length} player jerseys issued`} /></div><div className="admin-overview"><section className="payment-summary"><h3>Player payments</h3><div className="payment-summary-grid">{categoryPayments.map(item => <details key={item.category}><summary><strong>{item.category}</strong><span>{item.paid}/{item.count} paid</span><small>{item.pending.length} pending</small></summary>{item.pending.length > 0 && <ul>{item.pending.map(r => <li key={r.id}>{r.name} - {r.phone}</li>)}</ul>}{item.pending.length === 0 && <small>All payments confirmed</small>}</details>)}</div></section><section className="roster-summary"><h3>Team roster <small>{unassignedCount} unassigned</small></h3><div className="roster-team-filters"><button type="button" className={teamFilter === 'All teams' ? 'active' : ''} onClick={() => setTeamFilter('All teams')}>All teams <strong>{playerRows.length}</strong></button>{rosterCounts.map(team => <button type="button" key={team.name} className={teamFilter === team.name ? 'active' : ''} onClick={() => setTeamFilter(team.name)}>{team.name}<strong>{team.count}</strong></button>)}<button type="button" className={teamFilter === 'Unassigned' ? 'active' : ''} onClick={() => setTeamFilter('Unassigned')}>Unassigned<strong>{unassignedCount}</strong></button></div><div className="team-captain-assignments"><h4>Assign team captains</h4><p>Choose a player already assigned to each team.</p><div>{rosterCounts.map(team => <label key={team.name}><span>{team.name}</span><select aria-label={`Captain for ${team.name}`} value={teamCaptainFor(team.name)?.id || ''} onChange={event => assignCaptain(team.name, event.target.value)}><option value="">{team.count ? 'No captain selected' : 'Assign players to this team first'}</option>{playerRows.filter(r => r.details?.team_name === team.name).map(player => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>)}</div></div></section></div><div className="dash-toolbar"><input className="admin-search" type="search" placeholder="Search name, phone, or flat" aria-label="Search registrations by name, phone, or flat number" value={adminSearch} onChange={e => setAdminSearch(e.target.value)} /><select className="admin-quick-filter" aria-label="Filter by jersey issue status" value={jerseyFilter} onChange={event => setJerseyFilter(event.target.value)}><option value="All">All jersey statuses</option><option value="Issued">Issued</option><option value="Not issued">Not issued</option></select><select className="admin-quick-filter" aria-label="Filter by T-shirt size" value={shirtSizeFilter} onChange={event => setShirtSizeFilter(event.target.value)}><option>All sizes</option>{jerseySizes.map(size => <option key={size}>{size}</option>)}</select><div className="filters">{['All', 'Player', 'Owner', 'Men', 'Women', 'Kids', 'Jersey Distribution', 'Audience T-shirts'].map(f => <button type="button" role="tab" aria-selected={filter === f} key={f} className={filter === f ? 'active' : ''} onClick={() => { setFilter(f); if (['Jersey Distribution', 'Audience T-shirts'].includes(f)) { setTeamFilter('All teams'); setPaymentFilter('All'); } }}>{f}</button>)}</div>{online && <span className="refresh-status"><Radio size={13} className="live-dot" /> Refreshes every 5 sec</span>}</div>{filter === 'Audience T-shirts' && <section className="audience-order-summary" aria-label="Audience T-shirt orders by size"><div><strong>Audience T-shirt orders</strong><span>{audienceRows.length} orders · ₹300 each</span></div><div>{audienceSizeCounts.length ? audienceSizeCounts.map(item => <span key={item.size}><strong>{item.size}</strong> {item.count}</span>) : <small>No audience T-shirt orders yet.</small>}</div></section>}<div className="bulk-team-toolbar"><span>{selectedIds.length} players selected</span><select aria-label="Choose a team for selected players" value={bulkTeam} onChange={e => setBulkTeam(e.target.value)}><option value="">Choose team for selected players</option>{teams.map(team => <option key={team.name} value={team.name}>{team.name}</option>)}</select><button type="button" disabled={!selectedIds.length || !bulkTeam} onClick={assignSelected}>Assign team</button><button type="button" disabled={!selectedIds.length} onClick={() => setSelectedIds([])}>Clear selection</button></div><div className="table-wrap"><table><thead><tr><th><button className="sort-header" onClick={() => toggleSort('name')}>NAME / CONTACT (sort)</button></th><th>AGE</th><th>TYPE</th><th><button className="sort-header" onClick={() => toggleSort('category')}>CATEGORY (sort)</button></th><th>WING / FLAT</th><th>T-SHIRT SIZE</th><th>T-SHIRT NAME</th><th>T-SHIRT NUMBER</th><th>JERSEY DISTRIBUTION</th><th><button className="sort-header" onClick={() => toggleSort('date')}>REGISTERED (sort)</button></th><th><button className="sort-header" onClick={() => toggleSort('team')}>TEAM ASSIGNMENT (sort)</button></th><th>PAYMENT</th><th><button className="sort-header" onClick={() => toggleSort('payment')}>STATUS (sort)</button></th><th>ACTIONS</th></tr></thead><tbody>{shown.map(r => <tr key={r.id}><td><input type="checkbox" aria-label={`Select ${r.name}`} checked={selectedIds.includes(r.id)} disabled={r.type !== 'Player'} onChange={() => toggleSelect(r.id)} /><strong>{r.name}</strong><small>{r.phone}</small></td><td>{r.type === 'Player' ? r.details?.age || '-' : '-'}</td><td>{r.type}</td><td>{r.details?.player_category || '-'}</td><td>{r.details?.wing && r.details?.flat_no ? <>{r.details.wing} / {r.details.flat_no}</> : r.apartment || "—"}</td><td>{r.details?.['t-shirt_size'] || 'N/A'}</td><td>{r.details?.['t-shirt_name'] || 'N/A'}</td><td>{r.details?.['t-shirt_number'] || 'N/A'}</td><td>{['Player', 'Owner', 'Audience'].includes(r.type) ? <button type="button" className={`jersey-issued-toggle${r.details?.jersey_issued ? ' issued' : ''}`} aria-pressed={Boolean(r.details?.jersey_issued)} onClick={() => toggleJerseyIssued(r)}>{r.details?.jersey_issued ? `Issued${r.details?.jersey_issued_at ? ` - ${new Date(r.details.jersey_issued_at).toLocaleDateString('en-IN')}` : ''}` : 'Mark as issued'}</button> : '-'}</td><td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td><td>{r.type === 'Player' ? <><select className="admin-team-select" aria-label={`Assign ${r.name} to a team`} value={r.details?.team_name || ''} onChange={event => setTeamAssignment(r, event.target.value)}><option value="">Unassigned</option>{teams.map(team => <option key={team.name} value={team.name}>{team.name}</option>)}</select><button className="profile-edit-button" onClick={() => setSelectedPlayer({id:r.id,name:r.name,phone:r.phone,apartment:r.apartment,payment_status:r.payment_status,photo:r.details?.photo || "",...r.details,adminProfile:true})}>Player profile</button></> : <span>&#8212;</span>}</td><td>{r.payment_reference || '&#8212;'}</td><td><button className={`pay-status ${r.payment_status === 'Paid' ? 'paid' : 'pending'}`} onClick={() => setPaid(r)}><span />{r.payment_status === 'Paid' ? 'Payment completed' : 'Payment not done'}</button></td><td><button className="edit-registration-button" onClick={() => { setNotice(""); setEditTarget({ ...r, details: { 't-shirt_size': '', 't-shirt_name': '', 't-shirt_number': '', 'payment_time': '', ...(r.type === 'Player' ? { age: '', player_category: '', playing_role: '', experience: '', player_number: '', player_address: '', batting: '', bowling: '', matches: '', runs: '', wickets: '', team_name: '', photo: '' } : {}), ...(r.details || {}) } }); }} aria-label={'Edit ' + r.name}>Edit</button><button className="delete-button" onClick={() => setDeleteTarget(r)} aria-label={'Delete ' + r.name}><Trash2 size={14} /> Delete</button></td></tr>)}</tbody></table>{shown.length === 0 && <div className="empty-state"><Users size={28} /><p>No registrations yet. Share the link and get the league started.</p></div>}</div>{notice && <p className="notice">{notice}</p>}<div className="dash-foot"><Clock3 size={14} /> {online ? 'Changes are saved to the registrations database.' : 'This device only · local entries are not shared with other devices.'}</div></>}</div></div></AdminRenderBoundary>, document.body)}
    {editTarget && <div className="overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && !editBusy && setEditTarget(null)}><section className="dialog registration-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="registration-edit-title"><button className="close" onClick={() => !editBusy && setEditTarget(null)} aria-label="Close"><X /></button><div className="section-tag">ADMIN / EDIT REGISTRATION</div><h2 id="registration-edit-title">Edit <em>details.</em></h2><p className="edit-record-type">{editTarget.type} registration · ID {editTarget.id}</p><form onSubmit={saveRegistrationEdit} className="registration-edit-form"><div className="form-grid"><label>Full name<input name="name" required defaultValue={editTarget.name || ''} /></label><label>Mobile number<input name="phone" type="tel" required defaultValue={editTarget.phone || ''} /></label><label>Email<input name="email" type="email" defaultValue={editTarget.email || ''} /></label><label>Payment reference<input name="payment_reference" defaultValue={editTarget.payment_reference || ''} /></label><label>Payment status<select name="payment_status" defaultValue={editTarget.payment_status === 'Paid' ? 'Paid' : 'Pending'}><option value="Pending">Pending</option><option value="Paid">Paid</option></select></label>{Object.entries(editTarget.details || {}).map(([key, value]) => <label key={key}>{key === 'photo' ? 'Player photo URL' : key.replaceAll('_', ' ').replaceAll('-', ' ')}<input name={`detail:${key}`} defaultValue={String(value ?? '')} /></label>)}</div>{notice && <p className="notice" role="status">{notice}</p>}<div className="registration-edit-actions"><button type="button" className="cancel-edit" onClick={() => setEditTarget(null)} disabled={editBusy}>Cancel</button><button className="button button-lime" disabled={editBusy}>{editBusy ? 'Saving…': 'Save changes'} <Check size={16} /></button></div></form></section></div>}    {photoTarget && <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setPhotoTarget(null)}><section className="dialog photo-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-upload-title"><button className="close" onClick={() => setPhotoTarget(null)} aria-label="Close"><X /></button><div className="section-tag">REGISTERED PLAYER PHOTO</div><h2 id="photo-upload-title">Add your <em>photo.</em></h2><p>For ${photoTarget.name}. Enter the phone number used for this player registration so we can match the photo to the right player.</p><form onSubmit={submitPlayerPhoto} className="player-profile-form"><label>Registered mobile number<input type="tel" required value={photoPhone} onChange={e => setPhotoPhone(e.target.value)} placeholder="Enter registered phone number" /></label><label>Choose a player image<input type="file" accept="image/*" required onChange={async e => { const file=e.target.files?.[0]; if(file) { try { setPhotoUpload(await imageData(file)); } catch { setPhotoNotice("Could not read that image. Choose another file."); } } }} /></label>{photoUpload && <img className="upload-preview" src={photoUpload} alt="Selected player image" />}{photoNotice && <p className="notice" role="status">{photoNotice}</p>}<button className="button button-lime" disabled={photoBusy || !photoUpload}>{photoBusy ? "Uploading..." : "Upload image"} <Upload size={16}/></button></form></section></div>}
    {selectedTeam && <div className="overlay team-roster-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && setSelectedTeam(null)}><section className="dialog team-roster-dialog" role="dialog" aria-modal="true" aria-labelledby="team-roster-title"><button className="close" onClick={() => setSelectedTeam(null)} aria-label="Close team roster"><X /></button><div className="section-tag">GNPL 2026 / TEAM ROSTER</div><div className="team-roster-modal-heading"><span className="team-logo" style={{'--team-accent': selectedTeam.color}}><span>{selectedTeam.short}</span><small>GNPL</small></span><div><h2 id="team-roster-title">{selectedTeam.name}</h2><p><Trophy size={14} /> Captain: <strong>{registeredPlayers.find(player => player.team_name === selectedTeam.name && player.is_team_captain)?.name || selectedTeam.captain}</strong></p></div></div>{(() => { const members = registeredPlayers.filter(player => player.team_name === selectedTeam.name); return <><div className="team-roster-count"><Users size={17} /> {members.length} {members.length === 1 ? 'player' : 'players'} assigned</div>{members.length ? <ul className="team-roster-members">{members.map((player, index) => <li key={`${player.id || player.name}-${index}`}><span className="team-roster-member-name">{player.photo ? <img src={player.photo} alt="" /> : <span className="team-roster-avatar"><Users size={15} /></span>}<strong>{player.name}</strong></span>{player.role && <small className="player-role-badge">{player.role}</small>}</li>)}</ul> : <div className="team-roster-empty"><Users size={24} /><p>No players have been assigned to this team yet.</p></div>}</>; })()}</section></div>}
    {selectedPlayer && <PlayerProfile player={selectedPlayer} onClose={() => setSelectedPlayer(null)} onSave={savePlayerProfile} onPhotoChange={updateSelectedPlayerPhoto} profileBusy={profileBusy} />}
    {deleteTarget && <div className="confirm-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && !deleteBusy && setDeleteTarget(null)}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="section-tag">REMOVE REGISTRATION</div><h2 id="delete-title">Delete this <em>entry?</em></h2><p>Remove <strong>{deleteTarget.name}</strong> ({deleteTarget.type}) from the GNPL registration list? This action cannot be undone.</p><div className="confirm-actions"><button className="cancel-delete" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>Keep registration</button><button className="confirm-delete" onClick={deleteRegistration} disabled={deleteBusy}>{deleteBusy ? 'Deleting…' : <><Trash2 size={15} /> Delete registration</>}</button></div></section></div>}
  </div>;
}

export default App;
