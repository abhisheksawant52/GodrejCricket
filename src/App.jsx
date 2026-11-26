import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CircleDot, Clock3, Download, Printer, Menu, Radio, ShieldCheck, Trash2, Trophy, Users, X, Upload, MapPin, Shirt, Cookie, GlassWater, Camera, Share2 } from 'lucide-react';
import PlayerProfile from './PlayerProfile.jsx';
import { LeagueFeatures, SponsorShowcase, TeamShareGallery } from './LeagueFeatures.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminRenderBoundary from './AdminRenderBoundary.jsx';
import RegistrationSection from './RegistrationSection.jsx';
import { types } from './data/registrationTypes.js';
import { createPortal } from 'react-dom';


export const teams = [
  ['Prudentech Power Panthers', 'PPP', '#a855f7', 'Men', '01_PrudenTech_Power_Panthers_Men.png', 'Dr Ketan Chawdaa'],
  ['Prudentech Power Leopards', 'PPL', '#f59e0b', 'Women', '02_PrudenTech_Power_Leopards_Women.png', 'Dr Ketan Chawdaa'],
  ['Preetam Paltan', 'PP', '#ef4444', 'Men', '03_Preetam_Paltan_Men.png', 'Preetam Surana'],
  ['Prisha Smash Queens', 'PSQ', '#38bdf8', 'Women', '04_Prisha_Smash_Queens_Women.jpeg', 'Preetam Surana'],
  ['Bigtrip Royal Lions', 'BRL', '#fbbf24', 'Men', '05_BIGTRIP_Royal_Lions_Men.png', 'Ashish Sharma'],
  ['Ashish Knight Riders', 'AKR', '#9333ea', 'Kids', '06_Ashish_Knight_Riders_Kids.png', 'Ashish Sharma'],
  ['Titan Thunder', 'TT', '#facc15', 'Kids', '07_Titan_Thunder_Kids.png', 'Devendra Singh'],
  ['Black Thunder', 'BT', '#c084fc', 'Men', '08_Black_Thunder_Men.png', 'Devendra Singh'],
  ['Nest Warriors', 'NW', '#0ea5e9', 'Men', '09_Nest_Warriors_Men.jpeg', 'Abhishek Vaishnavi'],
  ['Nest Sanskriti', 'NS', '#ec4899', 'Men', '10_Nest_Sanskriti_Men.png', 'Cultural group'],
].map(([name, short, color, category, logo, owner]) => ({ name, short, color, category, logo: `/team-logos/${logo}`, owner, captain: 'To be announced', players: [] }));
const LOCAL_KEY = 'gnpl2026_registrations';
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };
const normalizeRows = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object' && !Array.isArray(row)).map(row => ({ ...row, details: row.details && typeof row.details === 'object' && !Array.isArray(row.details) ? row.details : {} })) : [];
const saveLocal = (rows) => localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
const parseCsv = text => {
  const rows = []; let row = []; let value = ''; let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted && char === '"' && source[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(value.trim()); value = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      row.push(value.trim()); value = '';
      if (row.some(cell => cell)) rows.push(row);
      row = []; if (char === '\r' && source[i + 1] === '\n') i += 1;
    } else value += char;
  }
  if (value || row.length) { row.push(value.trim()); if (row.some(cell => cell)) rows.push(row); }
  return rows;
};
const imageData = async file => {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose an image smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let blob = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', attempt === 0 ? .86 : .78));
    if (blob && blob.size <= 1_300_000) break;
    scale *= .82;
  }
  bitmap.close();
  if (!blob) throw new Error('Could not compress this image. Please choose another.');
  if (blob.size > 1_300_000) throw new Error('This photo is too detailed to upload. Choose a smaller image.');
  return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
};
const syncFieldError = (input) => {
  const error = input.closest('label')?.querySelector('.field-error');
  if (!error) return;
  const label = input.closest('label')?.firstChild?.textContent?.trim() || 'This field';
  const message = input.validity.valueMissing ? (input.name === 'payment_time' ? 'Google Pay payment time is required so we can identify your payment and notify you.' : `${label} is required.`) : input.validity.rangeUnderflow ? `Enter a value of at least ${input.min}.` : input.validity.rangeOverflow ? `Enter a value no greater than ${input.max}.` : input.validity.stepMismatch ? 'Enter a whole number.' : input.validity.patternMismatch ? 'Enter a valid phone number.' : '';
  error.textContent = message;
  error.hidden = !message;
  input.setAttribute('aria-invalid', String(Boolean(message)));
};
const csv = (rows) => {
  const cols = ['id', 'created_at', 'type', 'name', 'phone', 'wing', 'flat_no', 'apartment', 'payment_status', 'payment_reference', 'tshirt_size', 'tshirt_name', 'tshirt_number', 'category', 'team_name', 'jersey_issued', 'jersey_issued_at', 'details'];
  const cell = (x) => `"${String(x ?? '').replaceAll('"', '""')}"`;
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(c === 'details' ? JSON.stringify(r[c] || {}) : c === 'wing' ? r.details?.wing : c === 'flat_no' ? r.details?.flat_no : c === 'tshirt_size' ? r.details?.['t-shirt_size'] : c === 'tshirt_name' ? r.details?.['t-shirt_name'] : c === 'tshirt_number' ? r.details?.['t-shirt_number'] : c === 'team_name' ? r.details?.team_name : c === 'category' ? (r.details?.player_category || r.details?.sponsorship_area) : c === 'jersey_issued' ? Boolean(r.details?.jersey_issued) : c === 'jersey_issued_at' ? r.details?.jersey_issued_at : r[c])).join(','))].join('\r\n');
};

function MatchCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, new Date('2026-12-13T09:00:00+05:30').getTime() - now);
  const units = [
    { label: 'DAYS', value: Math.floor(remaining / 86400000) },
    { label: 'HOURS', value: String(Math.floor((remaining % 86400000) / 3600000)).padStart(2, '0') },
    { label: 'MIN', value: String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0') },
    { label: 'SEC', value: String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0') },
  ];
  return <div className="match-countdown" role="timer" aria-label="Countdown to match start, 13 December 2026 at 9 AM India time">
    <span className="match-countdown-label">COUNTDOWN TO FIRST BALL</span>
    <div className="match-countdown-values">{units.map((unit, index) => <React.Fragment key={unit.label}>{index > 0 && <i>:</i>}<span><strong>{unit.value}</strong><small>{unit.label}</small></span></React.Fragment>)}</div>
  </div>;
}

function App() {
  const displayPlayerKey = new URLSearchParams(window.location.search).get('playerDisplay');
  const [displayPlayer] = useState(() => {
    if (!displayPlayerKey) return null;
    const storageKey = `gnpl-player-display-${displayPlayerKey}`;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      localStorage.removeItem(storageKey);
      return saved?.expiresAt > Date.now() ? saved.player : null;
    } catch { return null; }
  });
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState('admin-overview');
  const [localAdmin, setLocalAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [rows, setRows] = useState(() => normalizeRows(readLocal()));
  const [online, setOnline] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [paymentBusyId, setPaymentBusyId] = useState(null);
  const [sponsorSyncBusy, setSponsorSyncBusy] = useState(false);
  const [sponsorSyncMessage, setSponsorSyncMessage] = useState('');
  const [paymentFlashId, setPaymentFlashId] = useState(null);
  const [formReady, setFormReady] = useState(false);
  const [sponsorContributionType, setSponsorContributionType] = useState('Cash');
  const [notice, setNotice] = useState('');
  const [auctionImportBusy, setAuctionImportBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [filter, setFilter] = useState('All');
  const [adminSearch, setAdminSearch] = useState('');
  const [soldFilter, setSoldFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkTeam, setBulkTeam] = useState('');
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState('All teams');
  const [publicTeamCategory, setPublicTeamCategory] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('All types');
  const [paymentCategoryFilter, setPaymentCategoryFilter] = useState('All categories');
  const [registrationDateFrom, setRegistrationDateFrom] = useState('');
  const [registrationDateTo, setRegistrationDateTo] = useState('');
  const [duplicateFilter, setDuplicateFilter] = useState('All');
  const [duplicateReviewFilter, setDuplicateReviewFilter] = useState('All');
  const [jerseyFilter, setJerseyFilter] = useState('All');
  const [shirtSizeFilter, setShirtSizeFilter] = useState('All sizes');
  const [registrationCounts, setRegistrationCounts] = useState(null);
  const [playerRegistrationOpen, setPlayerRegistrationOpen] = useState(false);
  const [playerRegistrationBusy, setPlayerRegistrationBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editPhoto, setEditPhoto] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [shareNotice, setShareNotice] = useState('');
  const [playersVisible, setPlayersVisible] = useState(false);
  const [audienceStatusVisible, setAudienceStatusVisible] = useState(false);
  const [audienceOrders, setAudienceOrders] = useState([]);
  const [audienceStatusLoading, setAudienceStatusLoading] = useState(false);
  const [audienceStatusError, setAudienceStatusError] = useState('');
  const [sponsorStatusVisible, setSponsorStatusVisible] = useState(false);
  const [sponsorStatusLoading, setSponsorStatusLoading] = useState(false);
  const [sponsorStatusError, setSponsorStatusError] = useState('');
  const [publicSponsors, setPublicSponsors] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamShareNotice, setTeamShareNotice] = useState('');
  const [soldCelebration, setSoldCelebration] = useState(null);
  const [soldBusyId, setSoldBusyId] = useState(null);
  useEffect(() => {
    if (!displayPlayerKey || !displayPlayer?.id) return undefined;
    const receiveSold = event => {
      if (event.key !== 'gnpl-auction-sold-event' || !event.newValue) return;
      try { const message = JSON.parse(event.newValue); if (message.playerId === displayPlayer.id && Date.now() - message.sentAt < 30000) setSoldCelebration({ name: message.name, team: message.team || '' }); } catch { /* Ignore malformed cross-tab messages. */ }
    };
    window.addEventListener('storage', receiveSold);
    return () => window.removeEventListener('storage', receiveSold);
  }, [displayPlayerKey, displayPlayer]);
  const announceSold = row => {
    try { localStorage.setItem('gnpl-auction-sold-event', JSON.stringify({ playerId: row.id, name: row.name, team: row.details?.team_name || '', sentAt: Date.now() })); }
    catch { setNotice('Sold was saved, but the shared player display could not be notified.'); }
  };
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const selectedTeamCaptain = selectedTeam ? registeredPlayers.find(player => player.team_name === selectedTeam.name && player.is_team_captain) : null;
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

  const openPlayerDisplay = player => {
    setSelectedPlayer(player);
    const key = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const displayData = {
      id: player.id, name: player.name, payment_status: player.payment_status,
      photo: player.photo, player_number: player.player_number, player_address: player.player_address,
      apartment: player.apartment, wing: player.wing, flat_no: player.flat_no,
      details: { wing: player.details?.wing || player.wing, flat_no: player.details?.flat_no || player.flat_no },
      age: player.age, experience: player.experience, batting: player.batting, bowling: player.bowling,
      matches: player.matches, runs: player.runs, wickets: player.wickets, team_name: player.team_name,
      player_category: player.player_category || player.category,
      auction_sold: Boolean(player.auction_sold), auction_sold_at: player.auction_sold_at || null,
      player_grade: player.player_grade || player.grade || null,
      playing_role: player.playing_role || player.role,
    };
    localStorage.setItem(`gnpl-player-display-${key}`, JSON.stringify({ player: displayData, expiresAt: Date.now() + 120000 }));
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('playerDisplay', key);
    window.open(url.toString(), 'GNPLPlayerDisplay');
  };

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

  useEffect(() => {
    const refreshPlayerRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/content', { cache: 'no-store' });
        if (response.ok) { const data = await response.json(); setPlayerRegistrationOpen(data.player_registration_open === true); }
      } catch { /* Keep the last known registration status. */ }
    };
    refreshPlayerRegistrationStatus();
    const timer = setInterval(refreshPlayerRegistrationStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const setPlayerRegistrationStatus = async open => {
    setPlayerRegistrationBusy(true);
    try {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ player_registration_open: open }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update player registration.');
      setPlayerRegistrationOpen(data.player_registration_open === true);
      setNotice(data.player_registration_open ? 'Player registration is now open.' : 'Player registration is now closed.');
    } catch (error) { setNotice(error.message || 'Could not update player registration.'); }
    finally { setPlayerRegistrationBusy(false); }
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
    const joinType = new URLSearchParams(window.location.search).get('join');
    const matchingType = types.find(item => item.key.toLowerCase() === String(joinType || '').toLowerCase());
    if (matchingType) { if (!['Player', 'Owner'].includes(matchingType.key)) setModal(matchingType); document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' }); }
    const teamCode = new URLSearchParams(window.location.search).get('team');
    const linkedTeam = teams.find(team => team.short.toLowerCase() === String(teamCode || '').toLowerCase());
    if (linkedTeam) { setSelectedTeam(linkedTeam); window.setTimeout(() => document.getElementById('teams')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    refreshRegistrationCounts();
    const timer = setInterval(refreshRegistrationCounts, 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (admin && online) { const timer = setInterval(() => loadRows(), 5000); return () => clearInterval(timer); } }, [admin, online, adminPass]);
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const items = document.querySelectorAll('.auction-update-card, .match-info-bar, .teams-heading, .teams-grid .team-card, .register-card, .community-scene, .league-updates-heading, .league-feature-panel, .team-share-gallery-grid article, .venue-overview-card, .matchday-left, .gallery-section .gallery-empty, .registration-faq, .trophy-showcase-heading, .trophy-award-card');
    if (!items.length) return;
    items.forEach(item => item.classList.add('scroll-reveal'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!admin || (!online && !localAdmin)) return;
    const root = document.querySelector('.admin-overlay');
    const targets = ['admin-overview', 'admin-payments', 'admin-team-rosters', 'admin-jerseys', 'admin-registrations'].map(id => document.getElementById(id)).filter(Boolean);
    if (!root || !targets.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveAdminSection(visible[0].target.id);
    }, { root, rootMargin: '-110px 0px -62% 0px', threshold: [0, .15, .35, .6] });
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [admin, online, localAdmin]);
  const counts = useMemo(() => ({ total: rows.length, paid: rows.filter(r => r.payment_status === 'Paid').length }), [rows]);
  const duplicateIds = useMemo(() => {
    const keys = new Map();
    for (const row of rows) {
      const fullName = String(row.name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
      if (!fullName) continue;
      const key = `${row.type}|name|${fullName}`;
      keys.set(key, [...(keys.get(key) || []), row.id]);
    }
    return new Set([...keys.values()].filter(group => group.length > 1).flat());
  }, [rows]);
  const registrationDateKey = row => { const date = new Date(row.created_at); return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const filteredRows = (filter === 'Jersey Distribution' ? rows.filter(r => ['Player', 'Owner', 'Audience'].includes(r.type)) : filter === 'Audience T-shirts' ? rows.filter(r => r.type === 'Audience') : filter === 'All' ? rows : ['Men', 'Women', 'Kids'].includes(filter)
    ? rows.filter(r => r.type === 'Player' && String(r.details?.player_category || '').trim().toLowerCase() === filter.toLowerCase())
    : rows.filter(r => r.type === filter)).filter(r => soldFilter === 'All' || (r.type === 'Player' && (soldFilter === 'Sold' ? Boolean(r.details?.auction_sold) : !r.details?.auction_sold))).filter(r => teamFilter === 'All teams' || (teamFilter === 'Unassigned' ? r.type === 'Player' && !r.details?.team_name : r.details?.team_name === teamFilter)).filter(r => paymentFilter === 'All' || (paymentFilter === 'Pending' ? r.payment_status !== 'Paid' : r.payment_status === 'Paid')).filter(r => !['Jersey Distribution', 'Audience T-shirts'].includes(filter) || jerseyFilter === 'All' || (jerseyFilter === 'Issued' ? r.details?.jersey_issued : !r.details?.jersey_issued)).filter(r => !['Jersey Distribution', 'Audience T-shirts'].includes(filter) || shirtSizeFilter === 'All sizes' || r.details?.['t-shirt_size'] === shirtSizeFilter).filter(r => [r.name, r.phone, r.details?.flat_no, r.apartment, r.details?.wing, r.details?.['t-shirt_name'], r.details?.['t-shirt_number'], r.details?.['t-shirt_size'], r.details?.team_name, r.details?.sponsorship_area, r.details?.sponsorship_type, r.details?.contribution_details].some(v => String(v || '').toLowerCase().includes(adminSearch.trim().toLowerCase()))).filter(r => !registrationDateFrom || registrationDateKey(r) >= registrationDateFrom).filter(r => !registrationDateTo || registrationDateKey(r) <= registrationDateTo).filter(r => duplicateFilter === 'All' || (duplicateFilter === 'Possible duplicates' ? duplicateIds.has(r.id) : !duplicateIds.has(r.id))).filter(r => duplicateReviewFilter === 'All' || (duplicateReviewFilter === 'Needs review' ? duplicateIds.has(r.id) && !r.details?.duplicate_reviewed : duplicateIds.has(r.id) && Boolean(r.details?.duplicate_reviewed)));
  const shown = [...filteredRows].sort((a, b) => {
    const val = r => sortConfig.key === 'name' ? r.name : sortConfig.key === 'date' ? r.created_at : sortConfig.key === 'category' ? (r.type === 'Sponsor' ? r.details?.sponsorship_area : r.details?.player_category) : sortConfig.key === 'sponsorshipType' ? r.details?.sponsorship_type : sortConfig.key === 'sponsorshipAmount' ? Number(r.details?.contribution_amount) || 0 : sortConfig.key === 'payment' ? r.payment_status : sortConfig.key === 'team' ? r.details?.team_name : sortConfig.key === 'auction' ? (r.details?.auction_sold ? 'sold' : 'unsold') : '';
    const x = String(val(a) || '').toLowerCase(), y = String(val(b) || '').toLowerCase();
    const comparison = sortConfig.key === 'sponsorshipAmount' ? Number(val(a)) - Number(val(b)) : x < y ? -1 : x > y ? 1 : 0;
    return comparison * (sortConfig.direction === 'asc' ? 1 : -1);
  });
  const playerRows = rows.filter(r => r.type === 'Player');
  const filteredTeamRows = playerRows.filter(r => teamFilter === 'All teams' || (teamFilter === 'Unassigned' ? !r.details?.team_name : r.details?.team_name === teamFilter));
  const paymentRows = rows.filter(r => !(r.type === 'Sponsor' && r.details?.sponsorship_type === 'In-kind')).filter(r => paymentFilter === 'All' || (paymentFilter === 'Pending' ? r.payment_status !== 'Paid' : r.payment_status === 'Paid')).filter(r => paymentTypeFilter === 'All types' || r.type === paymentTypeFilter).filter(r => paymentCategoryFilter === 'All categories' || (r.type === 'Player' && String(r.details?.player_category || '').toLowerCase() === paymentCategoryFilter.toLowerCase()));
  const paymentPlayerRows = paymentRows.filter(r => r.type === 'Player');
  const categoryPayments = ['Men', 'Women', 'Kids'].map(category => ({ category, count: paymentPlayerRows.filter(r => String(r.details?.player_category || '').toLowerCase() === category.toLowerCase()).length, paid: paymentPlayerRows.filter(r => String(r.details?.player_category || '').toLowerCase() === category.toLowerCase() && r.payment_status === 'Paid').length, pending: paymentPlayerRows.filter(r => String(r.details?.player_category || '').toLowerCase() === category.toLowerCase() && r.payment_status !== 'Paid') }));
  const rosterCounts = teams.map(team => ({ ...team, count: playerRows.filter(r => r.details?.team_name === team.name).length }));
  const auctionHighlights = registeredPlayers
    .filter(player => player.auction_sold && player.team_name && Number(player.sold_price) > 0)
    .sort((a, b) => Number(b.sold_price) - Number(a.sold_price))
    .slice(0, 3);
  const unassignedCount = playerRows.filter(r => !r.details?.team_name).length;
  const jerseyRows = rows.filter(r => ['Player', 'Owner', 'Audience'].includes(r.type));
  const filteredJerseyRows = jerseyRows.filter(r => jerseyFilter === 'All' || (jerseyFilter === 'Issued' ? Boolean(r.details?.jersey_issued) : !r.details?.jersey_issued)).filter(r => shirtSizeFilter === 'All sizes' || r.details?.['t-shirt_size'] === shirtSizeFilter);
  const jerseyIssuedCount = jerseyRows.filter(r => r.details?.jersey_issued).length;
  const audienceRows = rows.filter(r => r.type === 'Audience');
  const audienceSizeCounts = [...new Set(audienceRows.map(r => String(r.details?.['t-shirt_size'] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(size => ({ size, count: audienceRows.filter(r => String(r.details?.['t-shirt_size'] || '').trim() === size).length }));
  const audienceTeamCounts = teams.map(team => { const orders = audienceRows.filter(row => row.details?.team_name === team.name); const sizes = [...new Set(orders.map(row => String(row.details?.['t-shirt_size'] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)); return { name: team.name, total: orders.length, paid: orders.filter(row => row.payment_status === 'Paid').length, pending: orders.filter(row => row.payment_status !== 'Paid').length, issued: orders.filter(row => Boolean(row.details?.jersey_issued)).length, notIssued: orders.filter(row => !row.details?.jersey_issued).length, sizes: sizes.map(size => `${size}: ${orders.filter(row => row.details?.['t-shirt_size'] === size).length}`) }; });
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
  const assignSelected = async () => { const targets = rows.filter(r => selectedIds.includes(r.id) && ['Player', 'Audience'].includes(r.type)); if (!online) { const updated = rows.map(r => selectedIds.includes(r.id) && ['Player', 'Audience'].includes(r.type) ? { ...r, details: { ...(r.details || {}), team_name: bulkTeam || null, ...(r.details?.is_team_captain && bulkTeam !== r.details?.team_name ? { is_team_captain: false } : {}) } } : r); saveLocal(updated); setRows(updated); } else { for (const row of targets) await setTeamAssignment(row, bulkTeam); } setSelectedIds([]); setBulkTeam(''); };
  const updateSelectedPayment = async () => {
    const ids = selectedIds.filter(id => shown.some(row => row.id === id));
    if (!ids.length || !['Paid', 'Pending'].includes(bulkPaymentStatus)) return;
    setNotice('');
    if (online) {
      try {
        const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ ids, payment_status: bulkPaymentStatus }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { setNotice(data.error || 'Bulk payment update failed.'); return; }
        await loadRows();
      } catch { setNotice('Could not reach the registrations API. Payment statuses were not updated.'); return; }
    } else {
      const updated = rows.map(row => ids.includes(row.id) ? { ...row, payment_status: bulkPaymentStatus } : row);
      saveLocal(updated); setRows(updated);
    }
    setSelectedIds([]); setBulkPaymentStatus('');
  };
  const copyShareLink = async (joinType = '') => {
    const url = new URL(window.location.href);
    url.hash = joinType ? 'register' : '';
    if (joinType) url.searchParams.set('join', joinType); else url.searchParams.delete('join');
    try { await navigator.clipboard.writeText(url.toString()); setShareNotice(joinType ? `${joinType} registration link copied.` : 'Event link copied. Share it with your neighbours!'); }
    catch { setShareNotice('Copy the link from your browser address bar to share GNPL.'); }
  };

  const copyTeamLink = async team => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = 'teams';
    url.searchParams.set('team', team.short.toLowerCase());
    try { await navigator.clipboard.writeText(url.toString()); setTeamShareNotice('Team link copied. Share it with your neighbours!'); }
    catch { setTeamShareNotice(`Copy this team link: ${url.toString()}`); }
  };

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

  async function toggleAudienceStatus() {
    if (audienceStatusVisible) { setAudienceStatusVisible(false); return; }
    setAudienceStatusVisible(true);
    if (audienceOrders.length || audienceStatusLoading) return;
    setAudienceStatusLoading(true); setAudienceStatusError('');
    try {
      const response = await fetch('/api/audience', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load Audience T-shirt status.');
      setAudienceOrders(data.orders || []);
    } catch (error) {
      setAudienceStatusError(error.message || 'Could not load Audience T-shirt status.');
    } finally { setAudienceStatusLoading(false); }
  }

  async function toggleSponsorStatus() {
    if (sponsorStatusVisible) { setSponsorStatusVisible(false); return; }
    setSponsorStatusVisible(true);
    if (publicSponsors.length || sponsorStatusLoading) return;
    setSponsorStatusLoading(true); setSponsorStatusError('');
    try {
      const response = await fetch('/api/sponsors', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load sponsor status.');
      setPublicSponsors(data.sponsors || []);
    } catch (error) { setSponsorStatusError(error.message || 'Could not load sponsor status.'); }
    finally { setSponsorStatusLoading(false); }
  }

  async function shareLeague() {
    const shareData = { title: 'Godrej Nest Premier League 2026', text: 'Join GNPL 2026! Player registration is open today only; team owner registration is closed. Matches are on 13 December at Kandivali Turf Zone.', url: window.location.href };
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
      if (modal.key === 'Sponsor') { const area = details.sponsorship_area; const kind = details.sponsorship_type; const amountText = String(details.contribution_amount || '').trim(); const amount = Number(amountText); if (!['Snacks & refreshments', 'Cricket equipment', 'First aid & safety', 'Ground & match setup', 'Player support', 'Other'].includes(area)) throw new Error('Choose a sponsorship area.'); if (!['Cash', 'In-kind'].includes(kind)) throw new Error('Choose cash or in-kind sponsorship.'); if (kind === 'Cash' && (!/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0)) throw new Error('Enter a contribution amount greater than zero.'); if (kind === 'In-kind' && !String(details.contribution_details || '').trim()) throw new Error('Describe the items or support you would like to contribute.'); }
      if (modal.key === 'Player') {
        const age = Number(details.age);
        const category = details.player_category;
        if (!['Women', 'Kids'].includes(category)) throw new Error('Choose Women or Kids.');
        if (!Number.isInteger(age) || age < 8 || age > 120) throw new Error('Age must be a whole number from 8 to 120.');
        const eligible = category === 'Kids' ? age <= 15 : ['Men', 'Women'].includes(category) && age >= 16;
        if (!eligible) throw new Error(category === 'Kids' ? 'Kids category is for ages 8â€“15.' : category === 'Women' ? 'Women players must be 16 or older.' : 'Men category is for ages 16â€“120.');
        const experience = Number(details.experience);
        if (!Number.isInteger(experience) || experience < 0 || experience > 80 || experience > age) throw new Error('Enter cricket experience as whole years from 0 to 80, no more than the playerâ€™s age. Use 0 for a beginner.');
      }
      const wing = String(form.get('wing') || '').trim();
      const flatNo = String(form.get('flat_no') || '').trim();
      const paymentTransactionId = String(form.get('payment') || '').trim();
      const paymentTime = String(form.get('payment_time') || '').trim();
      const paymentReference = paymentTransactionId ? `${paymentTransactionId} / ${paymentTime}` : paymentTime;
      const payload = { type: modal.key, name: form.get('name'), phone: form.get('phone'), email: '', wing, flat_no: flatNo, apartment: [wing, flatNo].filter(Boolean).join(' / '), payment_reference: paymentReference, payment_time: paymentTime, details: { ...details, wing, flat_no: flatNo, ...(modal.key === 'Player' && playerPhoto ? { photo: playerPhoto } : {}) } };
      const response = await fetch('/api/registrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json(); const receiptData = { ...payload, id: result.id, created_at: result.created_at, payment_status: 'Pending' }; setReceipt(receiptData); setRegistrationSuccess(true); setNotice(modal.key === 'Audience' ? 'T-shirt order received! Payment is pending verification.' : modal.key === 'Sponsor' ? (payload.details.sponsorship_type === 'Cash' ? 'Sponsorship pledge received! Payment is pending verification.' : 'Thank you! Your in-kind sponsorship offer has been sent to the organisers.') : `Registration received! Your ${modal.key.toLowerCase()} place is confirmed. Payment is pending verification.`);
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
    const paymentNotApplicable = receipt.type === 'Sponsor' && receipt.details?.sponsorship_type === 'In-kind';
    const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const detailRows = Object.entries(receipt.details || {}).filter(([key, value]) => value && key !== 'wing' && key !== 'flat_no' && key !== 'team_name').map(([key, value]) => `<tr><th>${escapeHtml(key.replaceAll('_', ' '))}</th><td>${escapeHtml(value)}</td></tr>`).join('');
    const receiptHtml = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GNPL registration receipt</title><style>body{margin:0;padding:32px;background:#f3f5f7;color:#202a36;font:16px Arial,sans-serif}.receipt{max-width:680px;margin:auto;padding:34px;background:#fff;border:1px solid #dce3e8;border-radius:16px;box-shadow:0 12px 40px #17233414}.brand{color:#54205d;font-size:13px;font-weight:800;letter-spacing:.16em}.title{margin:24px 0 6px;font-size:30px}.sub{color:#637182;line-height:1.6}.status{display:inline-block;margin:12px 0;padding:8px 12px;border-radius:30px;background:#fff2d5;color:#825400;font-size:12px;font-weight:700}table{width:100%;margin-top:18px;border-collapse:collapse}th,td{padding:12px 8px;border-bottom:1px solid #e7ebef;text-align:left;vertical-align:top}th{width:38%;color:#697789;text-transform:capitalize;font-size:13px}td{font-weight:700;overflow-wrap:anywhere}.foot{margin-top:24px;color:#657285;font-size:13px;line-height:1.6}@media print{body{padding:0;background:#fff}.receipt{box-shadow:none;border:0}}</style><main class="receipt"><div class="brand">GODREJ NEST PREMIER LEAGUE / 2026</div><h1 class="title">Registration received</h1><p class="sub">Keep this receipt for your GNPL registration records.</p><div class="status">${paymentNotApplicable ? 'Payment not applicable for in-kind sponsorship' : 'Payment pending organiser verification'}</div><table><tbody><tr><th>Registration ID</th><td>${escapeHtml(receipt.id)}</td></tr><tr><th>Registration type</th><td>${escapeHtml(receipt.type)}</td></tr><tr><th>Name</th><td>${escapeHtml(receipt.name)}</td></tr><tr><th>Mobile</th><td>${escapeHtml(receipt.phone)}</td></tr><tr><th>Wing / flat</th><td>${escapeHtml(receipt.wing)} / ${escapeHtml(receipt.flat_no)}</td></tr><tr><th>Payment details</th><td>${paymentNotApplicable ? 'Not applicable' : escapeHtml(receipt.payment_time || receipt.payment_reference || 'Pending')}</td></tr>${detailRows}<tr><th>Submitted</th><td>${escapeHtml(new Date(receipt.created_at).toLocaleString('en-IN'))}</td></tr></tbody></table><p class="foot">Thank you for joining GNPL 2026. For questions, contact the Godrej Nest Cultural Team.</p></main></html>`;
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
    setPaymentBusyId(row.id); setNotice('');
    try {
      if (online) {
        const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: row.id, payment_status: next }) });
        if (!response.ok) throw new Error('Payment update failed.');
        await loadRows();
      } else {
        const updated = rows.map(r => r.id === row.id ? { ...r, payment_status: next } : r); saveLocal(updated); setRows(updated);
      }
      setPaymentFlashId(row.id); window.setTimeout(() => setPaymentFlashId(current => current === row.id ? null : current), 900);
    } catch (error) { setNotice(error.message || 'Payment update failed.'); }
    finally { setPaymentBusyId(null); }
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
  const toggleDuplicateReviewed = async row => {
    if (!duplicateIds.has(row.id)) return;
    const reviewed = !row.details?.duplicate_reviewed;
    setNotice('');
    if (!online) {
      const updated = rows.map(item => item.id === row.id ? { ...item, details: { ...(item.details || {}), duplicate_reviewed: reviewed } } : item);
      saveLocal(updated); setRows(updated); return;
    }
    try {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: row.id, duplicate_reviewed: reviewed }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || 'Could not save duplicate review status.'); return; }
      await loadRows();
    } catch { setNotice('Could not reach the registrations API. Review status was not updated.'); }
  };
  async function setPlayerGrade(row, grade) {
    if (row.type !== 'Player' || !['', 'A', 'A+', 'B', 'B+'].includes(grade)) return;
    setNotice('');
    if (!online) {
      const updated = rows.map(item => item.id === row.id ? { ...item, details: { ...(item.details || {}), player_grade: grade || null } } : item);
      saveLocal(updated); setRows(updated);
      return;
    }
    try {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: row.id, player_grade: grade }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || 'Could not update player grade.'); return; }
      await loadRows();
      const listResponse = await fetch('/api/players', { cache: 'no-store' });
      const listData = await listResponse.json();
      if (listResponse.ok) { setRegisteredPlayers(listData.players || []); setPlayersLoaded(true); }
    } catch { setNotice('Could not reach the registrations API. Player grade was not updated.'); }
  }

  async function markPlayerSold(row) {
    if (row.type !== 'Player' || soldBusyId) return;
    setNotice(''); setSoldBusyId(row.id);
    const sold = !row.details?.auction_sold;
    if (!online) {
      const updated = rows.map(item => item.id === row.id ? { ...item, details: { ...(item.details || {}), auction_sold: sold, auction_sold_at: sold ? new Date().toISOString() : null } } : item);
      saveLocal(updated); setRows(updated);
      if (sold) announceSold(row);
      setSoldBusyId(null); return;
    }
    try {
      const response = await fetch('/api/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ id: row.id, auction_sold: sold }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || 'Could not update auction status.'); return; }
      await loadRows();
      if (sold) announceSold(row);
    } catch { setNotice('Could not reach the registrations API. Auction status was not updated.'); }
    finally { setSoldBusyId(null); }
  }
  async function importAuctionCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!online) { setNotice('Sign in to the live admin dashboard before importing auction results.'); return; }
    setNotice(''); setAuctionImportBusy(true);
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error('The CSV has no player rows.');
      const headers = parsed[0].map(header => header.toLowerCase());
      const field = name => headers.indexOf(name.toLowerCase());
      const required = ['Player Name', 'Category', 'Base Price', 'Status', 'Sold Price', 'Assigned Team'];
      if (required.some(name => field(name) < 0)) throw new Error('This file is missing one or more required auction columns.');
      const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const teamLookup = new Map(teams.map(team => [normalize(team.name), team.name]));
      const playerLookup = new Map();
      rows.filter(row => row.type === 'Player').forEach(row => {
        const key = normalize(row.name);
        playerLookup.set(key, [...(playerLookup.get(key) || []), row]);
      });
      const updates = []; const unmatched = []; const invalid = [];
      for (const cells of parsed.slice(1)) {
        const get = name => cells[field(name)] || '';
        const name = get('Player Name');
        const matches = playerLookup.get(normalize(name)) || [];
        if (!name || matches.length !== 1) { unmatched.push(name || '(blank name)'); continue; }
        const status = get('Status').trim().toLowerCase();
        const grade = get('Category').replace(/\s/g, '').toUpperCase();
        const basePrice = Number(get('Base Price'));
        const soldPrice = Number(get('Sold Price') || 0);
        const teamLabel = get('Assigned Team').trim();
        const canonicalTeam = teamLabel && normalize(teamLabel) !== normalize('Unassigned') ? teamLookup.get(normalize(teamLabel)) : null;
        if (!['sold', 'available'].includes(status) || !['A+', 'A', 'B', 'B+'].includes(grade) || !Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(soldPrice) || soldPrice < 0 || (teamLabel && normalize(teamLabel) !== normalize('Unassigned') && !canonicalTeam)) {
          invalid.push(name); continue;
        }
        updates.push({
          id: matches[0].id,
          status: status === 'sold' ? 'Sold' : 'Available',
          team_name: status === 'sold' ? canonicalTeam : null,
          player_grade: grade,
          base_price: basePrice,
          sold_price: soldPrice,
          lot: Number(get('Lot #')) || null
        });
      }
      if (invalid.length) throw new Error(`Invalid auction values for: ${invalid.slice(0, 6).join(', ')}${invalid.length > 6 ? ', â€¦' : ''}. No rows were imported.`);
      if (!updates.length) throw new Error(`No CSV players matched registrations. ${unmatched.length} rows were not imported.`);
      const soldCount = updates.filter(item => item.status === 'Sold').length;
      const message = `Import ${updates.length} matched players from â€œ${file.name}â€? This will set ${soldCount} as Sold and ${updates.length - soldCount} as Available, update their team assignments, and replace those auction values. ${unmatched.length ? `${unmatched.length} unmatched rows will be skipped.` : ''}`;
      if (!window.confirm(message)) return;
      const response = await fetch('/api/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
        body: JSON.stringify({ auction_import: updates })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not import auction results.');
      await loadRows();
      const listResponse = await fetch('/api/players', { cache: 'no-store' });
      const listData = await listResponse.json().catch(() => ({}));
      if (listResponse.ok) { setRegisteredPlayers(listData.players || []); setPlayersLoaded(true); }
      setNotice(`Imported auction data for ${data.updated} players.${unmatched.length ? ` ${unmatched.length} unmatched rows skipped: ${unmatched.slice(0, 5).join(', ')}${unmatched.length > 5 ? ', â€¦' : ''}.` : ''}`);
    } catch (error) {
      setNotice(error.message || 'Could not read the auction CSV.');
    } finally { setAuctionImportBusy(false); }
  }
  async function setTeamAssignment(row, teamName) {
    if (!['Player', 'Audience', 'Owner'].includes(row.type)) return;
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
    const detailKeys = new Set(Object.keys(editTarget.details || {}));
    if (editTarget.type === 'Audience') {
      ['team_name', 't-shirt_size', 't-shirt_name', 't-shirt_number'].forEach(key => detailKeys.add(key));
    }
    if (editTarget.type === 'Player') {
      ['age', 'player_category', 'playing_role', 'experience', 'player_number', 'player_address', 'batting', 'bowling', 'matches', 'runs', 'wickets', 'team_name', 't-shirt_size', 't-shirt_name', 't-shirt_number'].forEach(key => detailKeys.add(key));
    }
    const details = Object.fromEntries([...detailKeys].map(key => [key, String(form.get(`detail:${key}`) ?? editTarget.details?.[key] ?? '')]));
    if (editPhoto) details.photo = editPhoto;
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
        if (editTarget.type === 'Player' || editTarget.type === 'Audience') {
          const playersResponse = await fetch('/api/players', { cache: 'no-store' });
          if (playersResponse.ok) { const playerData = await playersResponse.json(); setRegisteredPlayers(playerData.players || []); }
        }
      }
      setEditTarget(null);
      setEditPhoto('');
      setNotice('Registration details updated.');
    } catch (error) {
      setNotice(error.message || 'Could not update registration.');
    } finally {
      setEditBusy(false);
    }
  }

  async function addAdminRegistration(type) {
    const name = window.prompt(`Enter ${type.toLowerCase()} name`);
    if (!name) return;
    const phone = window.prompt('Enter mobile number');
    const wing = window.prompt('Enter wing');
    const flat_no = window.prompt('Enter flat number');
    if (!phone || !wing || !flat_no) return;
    const details = {};
    if (type === 'Player') {
      const age = window.prompt('Enter age');
      const player_category = window.prompt('Enter category: Men, Women, or Kids');
      if (!age || !['Men', 'Women', 'Kids'].includes(player_category)) return;
      details.age = age; details.player_category = player_category;
      details.playing_role = window.prompt('Playing role (Batter or Bowler)') || '';
      details.experience = window.prompt('Cricket experience in years') || '0';
    }
    if (type === 'Audience') {
      const team_name = window.prompt('Team for this audience T-shirt (use an exact team name)');
      const t_shirt_size = window.prompt('T-shirt size: XS, S, M, L, XL, XXL, XXXL');
      const t_shirt_name = window.prompt('Name printed on shirt');
      const t_shirt_number = window.prompt('Number printed on shirt (0-999)');
      if (!team_name || !['XS','S','M','L','XL','XXL','XXXL'].includes(t_shirt_size) || !t_shirt_name || !/^\d{1,3}$/.test(t_shirt_number || '')) return;
      Object.assign(details, { team_name, 't-shirt_size': t_shirt_size, 't-shirt_name': t_shirt_name, 't-shirt_number': t_shirt_number });
    }
    if (type === 'Sponsor') {
      const sponsorship_area = window.prompt('Sponsorship area: Snacks & refreshments, Cricket equipment, First aid & safety, Ground & match setup, Player support, or Other');
      if (!['Snacks & refreshments', 'Cricket equipment', 'First aid & safety', 'Ground & match setup', 'Player support', 'Other'].includes(sponsorship_area)) return;
      const sponsorship_type = window.prompt('Sponsorship type: Cash or In-kind');
      if (!['Cash', 'In-kind'].includes(sponsorship_type)) return;
      details.sponsorship_area = sponsorship_area;
      details.sponsorship_type = sponsorship_type;
      details.organization_name = name.trim();
      details.public_showcase_permission = 'yes';
      if (sponsorship_type === 'Cash') {
        details.contribution_amount = window.prompt('Cash contribution amount (INR)') || '';
        details.payment_time = window.prompt('Payment time (24-hour format, HH:MM)') || '';
      } else {
        details.contribution_details = window.prompt('Describe the items or support being provided') || '';
        if (!details.contribution_details) return;
      }
    }
    try {
      const response = await fetch('/api/registrations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify({ type, name, phone, wing, flat_no, payment_time: details.payment_time || '', details }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add registration.');
      setNotice(`${type} added successfully.`); await loadRows(); void refreshRegistrationCounts();
    } catch (error) { setNotice(error.message || 'Could not add registration.'); }
  }

  async function syncCommunitySponsors() {
    if (sponsorSyncBusy || !online) return;
    setSponsorSyncBusy(true);
    setSponsorSyncMessage('Adding the requested sponsor recordsâ€¦');
    setNotice('Adding the requested sponsor recordsâ€¦');
    try {
      const response = await fetch('/api/sponsors', { method: 'POST', headers: { 'x-admin-password': adminPass } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not sync sponsor records.');
      const refreshed = await loadRows(adminPass);
      if (!refreshed.ok) throw new Error(refreshed.message || 'Could not refresh the Sponsor tab.');
      const success = `Sponsor records are up to date. Added ${data.created || 0}; refreshed ${data.updated || 0}.`;
      setNotice(success); setSponsorSyncMessage(success);
    } catch (error) { const failure = error.message || 'Could not sync sponsor records.'; setNotice(failure); setSponsorSyncMessage(failure); }
    finally { setSponsorSyncBusy(false); }
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
  const downloadCsv = (data, filename) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(data)], { type: 'text/csv;charset=utf-8' })); a.download = filename; a.click(); URL.revokeObjectURL(a.href); };
  const exportTeamRoster = () => downloadCsv(filteredTeamRows, `gnpl-2026-${teamFilter.toLowerCase().replaceAll(' ', '-')}-team-roster.csv`);
  const exportPayments = () => downloadCsv(paymentRows, `gnpl-2026-${paymentFilter.toLowerCase()}-${paymentTypeFilter.toLowerCase().replaceAll(' ', '-')}-payments.csv`);
  const exportJerseyDistribution = () => downloadCsv(filteredJerseyRows, `gnpl-2026-jersey-distribution-${jerseyFilter.toLowerCase().replaceAll(' ', '-')}-${shirtSizeFilter.toLowerCase().replaceAll(' ', '-')}.csv`);
  const printTeamSheets = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { setNotice('Allow pop-ups to print team sheets.'); return; }
    const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const teamKey = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    const ownerKey = value => teamKey(value).replace(/^dr\s+/, '').replace(/(.)\1+/g, '$1').replace(/\bchaw(?:a)?da+\b/g, 'chawda');
    const teamSections = teams.map((team, index) => {
      const assignedMembers = rows.filter(row => ['Player', 'Audience'].includes(row.type) && teamKey(row.details?.team_name || row.team_name) === teamKey(team.name));
      const assignedOwners = rows.filter(row => row.type === 'Owner' && teamKey(row.details?.team_name || row.team_name) === teamKey(team.name));
      const ownerMatchesTeam = row => row.type === 'Owner' && ownerKey(row.name) === ownerKey(team.owner);
      const defaultOwner = rows.find(row => ownerMatchesTeam(row) && String(row.phone || '').trim()) || rows.find(ownerMatchesTeam);
      const ownerMembers = assignedOwners.length
        ? assignedOwners.map(owner => {
          const sameOwner = ownerKey(owner.name) === ownerKey(team.owner);
          return {
            ...owner,
            phone: String(owner.phone || '').trim() || (sameOwner ? defaultOwner?.phone : ''),
            details: sameOwner ? { ...(defaultOwner?.details || {}), ...(owner.details || {}) } : owner.details || {}
          };
        })
        : [{ ...(defaultOwner || {}), type: 'Owner', name: team.owner, phone: defaultOwner?.phone, details: defaultOwner?.details || {} }];
      const members = [...ownerMembers, ...assignedMembers]
        .sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'Owner' ? -1 : b.type === 'Owner' ? 1 : a.type === 'Player' ? -1 : 1);
      const playerCount = members.filter(member => member.type === 'Player').length;
      const ownerCount = members.filter(member => member.type === 'Owner').length;
      const audienceCount = members.filter(member => member.type === 'Audience').length;
      const body = members.length ? members.map((member, memberIndex) => {
        const d = member.details || {};
        return `<tr><td class="serial">${memberIndex + 1}</td><td><span class="type ${member.type === 'Audience' ? 'audience' : member.type === 'Owner' ? 'owner' : 'player'}">${member.type === 'Audience' ? 'Fan' : member.type}</span></td><td class="person">${escapeHtml(member.name)}</td><td class="shirt-name">${escapeHtml(d['t-shirt_name'] || '-')}</td><td class="size">${escapeHtml(d['t-shirt_size'] || '-')}</td><td class="number">${escapeHtml(d['t-shirt_number'] || '-')}</td><td class="contact">${escapeHtml(member.phone || '-')}</td></tr>`;
      }).join('') : '<tr><td colspan="7" class="empty">No players or audience members assigned to this team.</td></tr>';
      return `<section class="team-sheet" style="--team-accent:${escapeHtml(team.color || '#263d69')}"><header><div class="brand"><span class="brand-mark">GNPL</span><span>GODREJ NEST PREMIER LEAGUE <b>2026</b></span><span class="sheet-label">T-SHIRT PRODUCTION ROSTER</span></div><div class="team-heading"><div><p class="eyebrow">TEAM ${String(index + 1).padStart(2, '0')} / ${escapeHtml(team.category || 'GNPL').toUpperCase()}</p><h1>${escapeHtml(team.name)}</h1></div><div class="totals"><strong>${members.length}</strong><span>shirts total</span><small>${ownerCount} owners / ${playerCount} players / ${audienceCount} fans</small></div></div></header><table><thead><tr><th class="serial">#</th><th class="kind">GROUP</th><th>NAME</th><th>NAME ON SHIRT</th><th class="size">SIZE</th><th class="number">NUMBER</th><th class="contact">MOBILE</th></tr></thead><tbody>${body}</tbody></table><footer><span>GNPL 2026 / ${escapeHtml(team.name)} / Shirt allocation list</span><span>Check name, size and number before printing</span></footer></section>`;
    }).join('');
    const knownTeamKeys = new Set(teams.map(team => teamKey(team.name)));
    const unassignedFans = rows.filter(row => ['Audience', 'Player'].includes(row.type) && !knownTeamKeys.has(teamKey(row.details?.team_name || row.team_name)));
    const unassignedSection = unassignedFans.length ? `<section class="team-sheet unassigned"><header><div class="brand"><span class="brand-mark">GNPL</span><span>GODREJ NEST PREMIER LEAGUE <b>2026</b></span><span class="sheet-label">ACTION REQUIRED</span></div><div class="team-heading"><div><p class="eyebrow">PLAYERS &amp; AUDIENCE / NEEDS TEAM ASSIGNMENT</p><h1>Unassigned roster</h1></div><div class="totals"><strong>${unassignedFans.length}</strong><span>shirts to assign</span></div></div></header><table><thead><tr><th class="serial">#</th><th class="kind">GROUP</th><th>NAME</th><th>NAME ON SHIRT</th><th class="size">SIZE</th><th class="number">NUMBER</th><th class="contact">MOBILE</th></tr></thead><tbody>${unassignedFans.map((fan, i) => `<tr><td class="serial">${i + 1}</td><td><span class="type ${fan.type === 'Player' ? 'player' : 'audience'}">${fan.type === 'Player' ? 'Player' : 'Fan'}</span></td><td class="person">${escapeHtml(fan.name)}</td><td class="shirt-name">${escapeHtml(fan.details?.['t-shirt_name'] || '-')}</td><td class="size">${escapeHtml(fan.details?.['t-shirt_size'] || '-')}</td><td class="number">${escapeHtml(fan.details?.['t-shirt_number'] || '-')}</td><td class="contact">${escapeHtml(fan.phone || '-')}</td></tr>`).join('')}</tbody></table><footer><span>Assign these fans to a team from the admin page.</span><span>Unassigned shirts are included so no order is missed.</span></footer></section>` : '';
    printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNPL 2026 T-shirt Production Rosters</title><style>*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;background:#eef1f6;color:#18243a;font:13px/1.5 'Segoe UI',Arial,sans-serif;letter-spacing:.01em}.team-sheet{--team-accent:#263d69;width:min(1120px,calc(100% - 36px));margin:24px auto;padding:28px 32px;background:linear-gradient(145deg,#fff 0%,#fff 64%,color-mix(in srgb,var(--team-accent) 5%,white) 100%);border:1px solid #d8e0ec;border-top:8px solid var(--team-accent);border-radius:14px;box-shadow:0 14px 38px #17203316;break-after:page}.team-sheet:last-child{break-after:auto}.team-sheet.unassigned{--team-accent:#d27b16;border-top-color:#d27b16}.brand{display:flex;align-items:center;gap:12px;padding-bottom:15px;border-bottom:1px solid #dbe2ec;color:#66738a;font-size:10px;font-weight:800;letter-spacing:.13em}.brand-mark{display:grid;place-items:center;width:46px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--team-accent),color-mix(in srgb,var(--team-accent) 60%,#192a4b));color:white;font-size:14px;letter-spacing:.04em;box-shadow:0 4px 10px color-mix(in srgb,var(--team-accent) 24%,transparent)}.brand b{color:#23385f}.sheet-label{margin-left:auto;padding:6px 10px;border-radius:20px;background:color-mix(in srgb,var(--team-accent) 10%,white);color:#46536b;letter-spacing:.12em}.team-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:18px 0 17px;padding:20px 22px;border:1px solid color-mix(in srgb,var(--team-accent) 23%,#e3e9f1);border-left:5px solid var(--team-accent);border-radius:11px;background:linear-gradient(105deg,color-mix(in srgb,var(--team-accent) 11%,white),#fff 72%)}.eyebrow{margin:0 0 5px;color:#707e94;font-size:9px;font-weight:900;letter-spacing:.18em}.team-heading h1{margin:0;color:#1b2b4a;font-family:Georgia,'Palatino Linotype',serif;font-size:34px;line-height:1.08;letter-spacing:-.025em}.totals{display:grid;grid-template-columns:auto auto;align-items:center;column-gap:11px;padding:10px 14px;border:1px solid color-mix(in srgb,var(--team-accent) 22%,white);border-radius:9px;background:#fff;color:#53617a}.totals strong{grid-row:span 2;color:var(--team-accent);font-family:Georgia,'Palatino Linotype',serif;font-size:32px;line-height:1}.totals span{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.11em}.totals small{font-size:9px;color:#758198}table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;overflow:hidden;border:1px solid #d4ddea;border-radius:9px}thead{display:table-header-group}th{padding:11px 10px;background:linear-gradient(110deg,color-mix(in srgb,var(--team-accent) 78%,#182848),#263d69);color:#fff;border-right:1px solid #ffffff2b;text-align:left;font-size:9px;letter-spacing:.12em;font-weight:900}th:first-child{border-radius:8px 0 0 0}th:last-child{border-radius:0 8px 0 0}td{height:40px;padding:8px 10px;border-right:1px solid #dce3ec;border-bottom:1px solid #dce3ec;color:#263247;font-size:12px;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f4f7fb}tbody tr:last-child td{border-bottom:0}td:last-child{border-right:0}.serial,.size,.number{text-align:center}.serial{width:42px;color:#8290a5}.kind{width:78px}.size{width:72px;background:#fff7df;color:#744d00;font-size:13px;font-weight:900}.number{width:82px;background:#e6f5ed;color:#15573f;font-size:13px;font-weight:900}.contact{width:125px}.type{display:inline-block;padding:4px 9px;border-radius:20px;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.type.player{background:#dce8fa;color:#234675}.type.audience{background:#d8f2eb;color:#075c4c}.type.owner{background:#f1defb;color:#6b2785}.person{font-weight:750}.shirt-name{font-weight:800;color:#233d68;font-size:12px}.empty{text-align:center;color:#78859a;padding:24px}footer{display:flex;justify-content:space-between;gap:15px;padding-top:13px;color:#68778d;font-size:10px}@page{size:A4 landscape;margin:11mm}@media print{body{background:white}.team-sheet{width:auto;min-height:180mm;margin:0;padding:5mm 5mm 4mm;border:0;border-top:6px solid var(--team-accent);border-radius:0;box-shadow:none}.team-sheet.unassigned{border-top-color:#d27b16}.team-sheet:last-child{break-after:auto}h1,table,footer{break-inside:avoid}td{height:32px;padding:5px 7px;font-size:11px}th{padding:8px;font-size:9px}.brand{padding-bottom:10px}.team-heading{margin:12px 0;padding:14px 16px}.team-heading h1{font-size:28px}}</style></head><body>${teamSections}${unassignedSection}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script></body></html>`);
    printWindow.document.close(); printWindow.focus();
  };

  if (displayPlayerKey) {
    return displayPlayer
      ? <><PlayerProfile player={displayPlayer} displayOnly onClose={() => window.close()} />{soldCelebration && createPortal(<div className="sold-display-pop" role="dialog" aria-modal="true" aria-label={`${soldCelebration.name} sold`}><div className="sold-display-confetti" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div><button type="button" className="sold-display-close" onClick={() => setSoldCelebration(null)} aria-label="Close sold announcement"><X size={17} /></button><div className="sold-display-live"><span /> GNPL AUCTION</div><div className="sold-display-hammer"><Trophy size={16} /> THE HAMMER COMES DOWN</div><div className="sold-display-word">SOLD!</div><strong>{soldCelebration.name}</strong>{soldCelebration.team && <small>SIGNED BY {soldCelebration.team}</small>}<button type="button" className="sold-display-done" onClick={() => setSoldCelebration(null)}>CONTINUE</button></div>, document.body)}</>
      : <div className="overlay player-detail-overlay"><section className="dialog player-detail-dialog"><h1>Player display link expired</h1><p>Open the player profile again and choose â€œOpen full screen in new tabâ€.</p></section></div>;
  }

  const adminDashboardProps = { activeAdminSection, addAdminRegistration, adminSearch, assignCaptain, assignSelected, auctionImportBusy, audienceRows, audienceSizeCounts, audienceTeamCounts, bulkPaymentStatus, bulkTeam, categoryPayments, counts, duplicateFilter, duplicateIds, duplicateReviewFilter, exportJerseyDistribution, exportPayments, exportRows, exportTeamRoster, filter, filteredJerseyRows, filteredTeamRows, importAuctionCsv, jerseyFilter, jerseyIssuedCount, jerseyRows, jerseySizeCounts, jerseySizes, localAdmin, markPlayerSold, normalizeRows, notice, online, openPlayerDisplay, paymentBusyId, paymentCategoryFilter, paymentFilter, paymentFlashId, paymentRows, paymentTypeFilter, playerRegistrationBusy, playerRegistrationOpen, playerRows, printTeamSheets, readLocal, registrationDateFrom, registrationDateTo, rosterCounts, selectedIds, setActiveAdminSection, setAdmin, setAdminSearch, setBulkPaymentStatus, setBulkTeam, setDeleteTarget, setDuplicateFilter, setDuplicateReviewFilter, setEditPhoto, setEditTarget, setFilter, setJerseyFilter, setLocalAdmin, setNotice, setPaid, setPaymentCategoryFilter, setPaymentFilter, setPaymentTypeFilter, setPlayerGrade, setPlayerRegistrationStatus, setRegistrationDateFrom, setRegistrationDateTo, setRows, setSelectedIds, setShirtSizeFilter, setSoldFilter, setTeamAssignment, setTeamFilter, shirtSizeFilter, shown, signIn, soldBusyId, soldFilter, sponsorSyncBusy, sponsorSyncMessage, syncCommunitySponsors, teamCaptainFor, teamFilter, teams, toggleDuplicateReviewed, toggleJerseyIssued, toggleSelect, toggleSort, unassignedCount, updateSelectedPayment };
return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="topline"><span><Radio size={13} className="live-dot" /> COMMUNITY CRICKET. BIG MATCH ENERGY.</span><span className="topline-right">AN INITIATIVE BY GODREJ NEST CULTURAL TEAM</span></div>
    <header className="nav wrap"><a href="#home" className="brand"><img src="/nest-sanskriti-logo.png" alt="Nest Sanskriti Mandal" className="brand-logo" /><span className="brand-copy">GN<span className="brand-accent">PL</span><small>GODREJ NEST PREMIER LEAGUE</small></span></a><div className="header-cricket" aria-hidden="true"><svg viewBox="0 0 360 126" role="presentation"><ellipse className="header-orbit" cx="182" cy="73" rx="154" ry="45"/><ellipse className="header-pitch" cx="187" cy="94" rx="102" ry="19"/><path className="header-pitch-line" d="M118 92h138"/><g className="header-bowler"><circle cx="57" cy="38" r="9"/><path d="M55 49 48 72l17 4 7-24m-12 2L43 39m15 12 12-14m-7 25L48 91m19-15 9 16"/></g><g className="header-batter"><circle cx="184" cy="30" r="10"/><path d="m180 41-11 26 18 8 11-25m-20 2-18 12m29-11 12 12m-22 7-12 24m20-22 15 21"/><g className="header-bat"><path d="M0 0 33-39"/><path d="m25-48 14 10-6 8-14-10z"/></g></g><g className="header-wickets"><path d="M279 75V43m8 32V40m8 35V43m-17 0h20"/></g><g className="header-ball"><circle cx="104" cy="59" r="5"/><path d="M101 56q5 2 6 6"/></g><text className="header-six" x="247" y="31">SIX!</text></svg></div><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-controls="primary-navigation" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button><nav id="primary-navigation" aria-label="Main navigation" className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#league" onClick={() => setMenuOpen(false)}>The league</a><a href="#teams" onClick={() => setMenuOpen(false)}>Team structure</a><a href="#auction-update" onClick={() => setMenuOpen(false)}>Auction closed</a><a href="#register" onClick={() => setMenuOpen(false)}>Register</a><a href="#schedule" onClick={() => setMenuOpen(false)}>Match day</a><a href="#announcements" onClick={() => setMenuOpen(false)}>Updates</a><button className="nav-admin" onClick={openAdmin}>Admin <ArrowUpRight size={15} /></button></nav></header>
    <div className="mobile-quick-actions" aria-label="Quick links"><a href="#register">Register to play <ArrowRight size={16} /></a><a href="#teams"><Users size={16} /> Team details</a></div>
    <main id="main-content">
      <section className="hero wrap" id="home">
        <div className="hero-grain" />
        <div className="hero-copy"><div className="organizer-banner"><span className="organizer-label">AN INITIATIVE BY</span><strong>GODREJ NEST CULTURAL TEAM</strong></div><div className="eyebrow"><span className="eyebrow-line" /> THE NEIGHBOURHOOD LEAGUE IS BACK</div><h1 className="league-title"><span>GODREJ NEST</span><span className="league-title-second">PREMIER LEAGUE</span><em>2026</em></h1><p className="hero-tagline">Josh Bhi Junoon Bhi</p><p className="hero-text">Meet the GNPL 2026 teams and follow match-day updates.</p><div className="hero-actions"><a className="button button-lime" href="#register">Registration closed <ArrowRight size={17} /></a><a className="tshirt-buy-shortcut" href="#venue-shirt"><span className="tshirt-shortcut-icon"><Shirt size={17} /></span><span><strong>Audience T-Shirt Buy Now</strong><small>View the jersey</small></span><ArrowUpRight size={14} /></a><button type="button" className={`hero-player-list-button${playersVisible ? ' active' : ''}`} aria-expanded={playersVisible} aria-controls="registered-player-panel" onClick={openPublicPlayerList}><Users size={16} /> {playersVisible ? 'Hide player list' : 'Players & payment status'}</button><button type="button" className="sponsor-front-cta" onClick={() => { const sponsor = types.find(type => type.key === 'Sponsor'); setNotice(''); setReceipt(null); setFormReady(false); setRegistrationSuccess(false); setSponsorContributionType('Cash'); setModal(sponsor); }}><Trophy size={16} /> Sponsor match day <ArrowUpRight size={15} /></button></div>{shareNotice && <p className="share-notice" role="status">{shareNotice}</p>}{shareOpen && <section className="share-panel" aria-label="Share GNPL"><div><strong>Scan to open the event page</strong><small>Share the page or a direct registration link.</small><img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(window.location.origin)}`} alt="QR code linking to the GNPL event page" loading="lazy" /></div><div className="share-links"><button type="button" onClick={() => copyShareLink()}>Copy event link</button>{types.map(item => <button type="button" key={item.key} onClick={() => copyShareLink(item.key)}>Copy {item.key.toLowerCase()} registration link</button>)}</div></section>}<div className="hero-invite"><span className="hero-invite-tag">THE LEAGUE IS FOR EVERYONE</span><strong>Play. Cheer. Celebrate.</strong><div className="hero-event-meta"><span><small>MATCH DATES</small><strong>13 DECEMBER 2026</strong></span><span><small>VENUE</small><strong>KANDIVALI TURF ZONE</strong></span></div><small>Gents, ladies, senior citizens and children are welcome.</small><small>Never held a bat? You are welcome here. Refreshments and a player T-shirt will be provided.</small><div className="venue-perks"><span className="floating-perk refreshments-perk"><span className="snack-drink-icons"><span className="perk-icon-float snack-icon-float" aria-label="Snacks"><Cookie size={17} /></span><span className="perk-icon-float drink-icon-float" aria-label="Healthy drinks"><GlassWater size={17} /></span></span><span>Snacks &amp; healthy drinks</span></span><span className="shirt-perk floating-perk"><span className="perk-icon-float shirt-icon-float"><Shirt size={19} /></span><span>T-shirt provided to every player</span></span></div></div><div className="hero-proof"><div className="avatar-stack" aria-label="GNPL players"><b>GN</b><b>XI</b><b>{'\u{1F3CF}'}</b><b>+</b></div><span>Players, owners & fans<br /><strong>all under one roof</strong></span></div></div>
        
        <a className="hero-shirt-float" href="#venue-shirt" aria-label="View and buy the official GNPL audience T-shirt">
          <span className="hero-shirt-kicker">OFFICIAL GNPL 2026</span>
          <img src="/gnpl-audience-jersey.png" alt="GNPL audience T-shirt front and back" />
          <span className="hero-shirt-copy"><strong>Audience T-Shirt</strong><small>&#8377;300 &middot; Buy now</small></span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <div className="hero-trophy-stage" aria-label="GNPL 2026 trophy">
          <span className="hero-trophy-glow" />
          <img className="hero-trophy-art" src="/gnpl-trophy-3d.png" alt="3D gold and silver GNPL cricket trophy" />
          <span className="hero-trophy-label">CHASE THE CUP <b>2026</b></span>
        </div>
        <div className="scroll-cue"><span /> SCROLL TO EXPLORE</div>
      </section>

      <section className="match-ready wrap" aria-label="GNPL match day information">
        <div className="match-info-bar">
          <div className="match-info-details">
            <span className="match-ready-kicker"><span className="match-ready-live-dot" /> GNPL MATCH DAY</span>
            <strong>13 December 2026</strong>
            <small>9:00 AM IST Â· Kandivali Turf Zone</small>
            <a className="match-directions-link" href="https://www.google.com/maps/search/?api=1&amp;query=Kandivali+Turf+Zone+Gopinath+Munde+Ground+Kandivali+East" target="_blank" rel="noreferrer"><MapPin size={13} /> Get venue directions <ArrowUpRight size={13} /></a>
          </div>
          <MatchCountdown />
          <div className="match-info-trophies" aria-label="Menâ€™s, womenâ€™s, and kidsâ€™ championships">
            <span className="match-ready-trophy-unit match-ready-trophy-men"><Trophy className="match-ready-trophy match-ready-trophy-one" /><small>MEN</small></span>
            <span className="match-ready-trophy-unit match-ready-trophy-women"><Trophy className="match-ready-trophy match-ready-trophy-two" /><small>WOMEN</small></span>
            <span className="match-ready-trophy-unit match-ready-trophy-kids"><Trophy className="match-ready-trophy match-ready-trophy-three" /><small>KIDS</small></span>
          </div>
        </div>
      </section>
      <SponsorShowcase />
      
      <section className="auction-update wrap" id="auction-update" aria-labelledby="auction-update-title">
        <div className="auction-update-card">
          <div className="auction-update-copy">
            <div className="auction-update-kicker"><span className="auction-update-pulse" /> GNPL 2026 / LEAGUE STATUS <span className="auction-closed-badge">AUCTION CLOSED</span></div>
            <h2 id="auction-update-title">TEN TEAMS. <em>SQUADS SET.</em></h2>
            <p className="auction-update-lede">Meet the owners and teams.</p>
            {auctionHighlights.length > 0 && <div className="auction-highlight-panel" aria-label="Top verified auction bids">
              <span className="auction-highlight-title"><Trophy size={15} /> TOP AUCTION PICKS</span>
              <div className="auction-highlight-list">{auctionHighlights.map((player, index) => <div className="auction-highlight" key={player.id || player.name}>
                <span className="auction-highlight-rank">{String(index + 1).padStart(2, '0')}</span>
                <span className="auction-highlight-player"><strong>{player.name}</strong><small>{player.team_name}</small></span>
                <b>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(player.sold_price))}</b>
              </div>)}</div>
            </div>}
            <div className="auction-update-actions">
              <a className="auction-update-teams-link" href="#teams">See teams <ArrowRight size={15} /></a>
            </div>
            <p className="auction-update-deadline">Women and kids player registration is open. Register before midnight.</p>
          </div>
          <div className="auction-update-art" aria-hidden="true">
            <span className="auction-art-orbit auction-art-orbit-one" />
            <span className="auction-art-orbit auction-art-orbit-two" />
            <span className="auction-art-star auction-art-star-one">âœ¦</span>
            <span className="auction-art-star auction-art-star-two">âœ¦</span>
            <div className="auction-art-trophy"><Trophy size={76} strokeWidth={1.5} /></div>
            <span className="auction-art-ball"><i /></span>
            <span className="auction-art-stump stump-one" />
            <span className="auction-art-stump stump-two" />
            <span className="auction-art-stump stump-three" />
            <span className="auction-art-bail" />
            <span className="auction-art-label">SQUADS<br />FORMING</span>
          </div>
        </div>
      </section>
      <LeagueFeatures admin={admin && online} adminPass={adminPass} rows={rows} teams={teams} players={registeredPlayers} />
      <section className="trophy-showcase wrap" aria-labelledby="trophy-showcase-title">
        <div className="trophy-showcase-heading"><div><span className="section-tag">GNPL 2026 / THE PRIZE</span><h2 id="trophy-showcase-title">PLAY FOR <em>GLORY.</em></h2></div><p>Three championships. One league. A season to remember.</p></div>
        <div className="trophy-showcase-grid">{[{ title: 'Menâ€™s Championship', label: 'MEN', accent: '#ffd166' }, { title: 'Womenâ€™s Championship', label: 'WOMEN', accent: '#ff78b8' }, { title: 'Kidsâ€™ Championship', label: 'KIDS', accent: '#63d9e5' }].map((award, index) => <article key={award.label} className={`trophy-award-card trophy-award-${index + 1}`} style={{ '--trophy-accent': award.accent }}><span className="trophy-award-kicker">GNPL 2026 / {award.label}</span><div className="trophy-award-art"><span className="trophy-award-halo"/><Trophy aria-hidden="true" strokeWidth={1.25}/><span className="trophy-award-spark trophy-spark-one">âœ¦</span><span className="trophy-award-spark trophy-spark-two">âœ¦</span></div><strong>{award.title}</strong><small>THE NEXT CHAMPIONS</small></article>)}</div>
      </section>      <section className="teams-section wrap" id="teams">
        <div className="section-tag">03 / MEET THE TEAMS</div>
        <div className="teams-heading"><h2>THE SQUADS.<br /><em>THE PRIDE.</em></h2><p>Meet all ten formed teams, their owners, and the players representing them.</p></div>
        <div className="team-filter-bar" aria-label="Filter teams by category"><span>SHOW TEAMS</span><div>{['All', 'Men', 'Women', 'Kids'].map(category => <button type="button" key={category} aria-pressed={publicTeamCategory === category} className={publicTeamCategory === category ? 'active' : ''} onClick={() => setPublicTeamCategory(category)}>{category === 'All' ? 'All teams' : `${category}â€™s`}</button>)}</div><small>{teams.filter(team => publicTeamCategory === 'All' || team.category === publicTeamCategory).length} teams</small></div>
        <div className="teams-grid">{teams.filter(team => publicTeamCategory === 'All' || team.category === publicTeamCategory).map(team => {
          const index = teams.indexOf(team);
          const squad = registeredPlayers.filter(player => player.team_name === team.name);
          const captainName = squad.find(player => player.is_team_captain)?.name || team.captain;
          return <article className="team-card team-card-clickable" key={team.name} style={{'--team-accent': team.color}} role="button" tabIndex={0} aria-label={`View ${team.name} team roster`} onClick={() => { setTeamShareNotice(''); setSelectedTeam(team); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setTeamShareNotice(''); setSelectedTeam(team); } }}>
            <div className="team-card-top"><span>GNPL 2026 / TEAM {String(index + 1).padStart(2, '0')}</span><span className="team-status">{squad.length ? 'SQUAD CONFIRMED' : 'TO BE ANNOUNCED'}</span></div>
            <div className="team-identity"><img className="team-logo team-artwork" loading="lazy" decoding="async" src={team.logo} alt={`${team.name} logo`} /><div><h3>{team.name}</h3><p className="team-category">{team.category} team</p><p className="team-owner-name"><small>OWNER</small><strong>{team.owner}</strong></p><p className="team-captain-name"><small>CAPTAIN</small><strong>{captainName}</strong></p></div></div>
            <div className="squad-heading"><span><Users size={15} /> PLAYER SQUAD</span><strong>{squad.length ? `${squad.length} PLAYERS` : 'TO BE ANNOUNCED'}</strong></div>
            {squad.length ? <ul className="squad-list">{squad.map((player, playerIndex) => <li key={`${player.name}-${playerIndex}`}><span>{player.name}</span>{player.role && <small className="player-role-badge">{player.role}</small>}</li>)}</ul> : <div className="squad-empty"><span className="squad-people"><i/><i/><i/><i/></span><p>Player list coming soon.</p></div>}
          </article>;
        })}</div>
      </section>



      <TeamShareGallery teams={teams} players={registeredPlayers} />

      <section className="venue-overview wrap" id="venue"><div className="section-tag">GNPL 2026 / VENUE OVERVIEW</div><div className="venue-overview-card"><div><span className="venue-kicker"><MapPin size={15}/> MATCH VENUE</span><h2>Kandivali <em>Turf Zone</em></h2><p>00 Gopinath Munde Ground, Near Sapphire Heights, Lokhandwala Foundation School, Akurli Road, Lokhandwala Complex, Kandivali East, Mumbai - 400101</p><a href="https://www.google.com/maps/search/?api=1&query=Kandivali+Turf+Zone+Gopinath+Munde+Ground+Kandivali+East" target="_blank" rel="noreferrer">Open venue in Google Maps <ArrowUpRight size={15}/></a><div className="venue-pricing"><span><strong>Men</strong> Rs 600</span><span><strong>Women</strong> Rs 400</span><span><strong>Kids</strong> Rs 300</span></div><small>Player T-shirt and refreshments included.</small></div><div className="shirt-showcase official-jersey-showcase" id="venue-shirt"><img className="venue-jersey-mockup" src="/gnpl-audience-jersey.png" alt="Official GNPL 2026 jersey front and back design" /><div className="venue-jersey-details"><strong>OFFICIAL GNPL 2026 T-SHIRT</strong><span>Audience jersey Â· â‚¹300</span><button type="button" className="venue-jersey-buy" onClick={() => { const item = types.find(type => type.key === 'Audience'); setNotice(''); setReceipt(null); setFormReady(false); setRegistrationSuccess(false); setModal(item); }}>Buy now <ArrowUpRight size={15} /></button></div></div></div></section>


      <RegistrationSection clockNow={clockNow} playerRegistrationOpen={playerRegistrationOpen} setFormReady={setFormReady} setModal={setModal} setNotice={setNotice} setPhotoError={setPhotoError} setPlayerPhoto={setPlayerPhoto} setReceipt={setReceipt} setRegistrationSuccess={setRegistrationSuccess} setSponsorContributionType={setSponsorContributionType} />

      <section className="announcements-section wrap" id="announcements" aria-labelledby="announcements-title">
        <div className="registration-update-bar">
          <div><span>PLAYER REGISTRATION</span><strong id="announcements-title">Open through 25 November</strong><small>New players can still register; organizers will assign teams.</small></div>
          <a href="#register">Register to play <ArrowRight size={15} /></a>
        </div>
      </section>
      <section className="gallery-section wrap" id="gallery"><div className="section-tag"><Camera size={15} /> GNPL 2026 / MOMENTS</div><div className="public-section-heading"><div><h2>THE <em>GALLERY.</em></h2><p>Match day memories, shared with the neighbourhood.</p></div></div><div className="gallery-empty"><span><Camera size={30} /></span><div><strong>Photos will be added after match day</strong><p>Check back after 13 December for highlights from the league.</p></div></div></section>
      <section className="ticker" aria-label="Tournament highlights"><div className="ticker-track">{Array.from({ length: 2 }, (_, i) => <span key={i}>COMMUNITY FIRST <b>âœ³</b> CRICKET ALWAYS <b>âœ³</b> GOOD TIMES GUARANTEED <b>âœ³</b> GNPL 2026 <b>âœ³</b> COMMUNITY FIRST <b>âœ³</b> CRICKET ALWAYS <b>âœ³</b> GOOD TIMES GUARANTEED <b>âœ³</b></span>)}</div></section>

      <section className="intro-section wrap" id="league"><div className="section-tag">02 / THE LEAGUE</div><div className="intro-grid"><h2>MORE THAN<br />A <em>MATCH.</em></h2><div className="intro-copy"><p>Itâ€™s the neighbour who bowls a mean yorker. The family in the front row. The team that starts as strangers and ends as friends.</p><p>Godrej Nest Premier League brings every tower and every neighbour together through cricket. Arranged by Godrej Nest Cultural Team.</p><p className="registration-closed-notice" role="status"><strong>Women and kids player registration is open.</strong> Team owner registration is closed.</p><a href="#register" className="underlink">Find your place in the league <ArrowRight size={15} /></a></div></div><div className="stat-row"><div><strong>02</strong><span>WAYS TO JOIN</span></div><div><strong>01</strong><span>COMMUNITY</span></div><div><strong>âˆž</strong><span>MEMORIES TO MAKE</span></div><div className="stat-note"><span className="live-dot" /> WOMEN & KIDS REGISTRATION OPEN</div></div><div className="live-board"><div className="live-board-head"><div><span className="live-dot" /> LIVE LEAGUE BOARD</div><span className="live-refresh">Live Â· updates every 5 seconds</span></div><div className="live-board-grid"><div className="live-total"><small>TOTAL REGISTRATIONS</small><strong key={registrationCounts?.total ?? 'total-loading'}>{registrationCounts ? registrationCounts.total : 'â€”'}</strong><span>THE NEST IS FILLING UP</span></div><button type="button" className={`live-count player-count-toggle${playersVisible ? ' active' : ''}`} aria-expanded={playersVisible} aria-controls="registered-player-panel" onClick={toggleRegisteredPlayers}><small>PLAYERS</small><strong key={registrationCounts?.players ?? 'players-loading'}>{registrationCounts ? registrationCounts.players : '\u2014'}</strong><span>{playersVisible ? 'CLICK TO HIDE NAMES' : 'CLICK TO VIEW PLAYER NAMES'}</span></button><div className="live-count"><small>TEAM OWNERS</small><strong key={registrationCounts?.owners ?? 'owners-loading'}>{registrationCounts ? registrationCounts.owners : 'â€”'}</strong><span>BUILDING THEIR TEAMS</span></div></div><button type="button" className={`public-roster-button${playersVisible ? ' active' : ''}`} aria-expanded={playersVisible} aria-controls="registered-player-panel" onClick={toggleRegisteredPlayers}><Users size={17} />{playersVisible ? "Hide player list" : "View player list & payment status"}<ArrowRight size={16} /></button></div>{playersVisible && <div className="registered-player-panel live-player-panel" id="registered-player-panel" aria-live="polite">{playersLoading ? <p>Loading registered players...</p> : playersError ? <p>{playersError}</p> : registeredPlayers.length ? <><div className="player-panel-heading">REGISTERED PLAYERS <span>{registeredPlayers.length}</span></div><div className="public-player-list-head"><strong>PLAYER</strong><strong>PAYMENT STATUS</strong></div><ul>{registeredPlayers.map((player, index) => <li key={`${player.name}-${index}`}><div className="public-player-link">{player.photo ? <img className="player-avatar" src={player.photo} alt={player.name} /> : <span className="player-avatar player-avatar-empty" aria-label="Image not updated" />}<span className="player-name-stack"><strong>{player.name}</strong><small className={player.team_name ? "player-team-badge" : "player-team-unassigned"}>{player.team_name ? `Team: ${player.team_name}` : "Team not assigned yet"}</small>{!player.photo && <small>Image not updated</small>}</span></div><span className="public-player-meta">{player.role && <small className="player-role-badge">{player.role}</small>}{player.grade && <small className="player-grade-badge">GRADE {player.grade}</small>}{typeof player.auction_sold === "boolean" && <small className={player.auction_sold ? "public-auction-status sold" : "public-auction-status"}>{player.auction_sold ? "SOLD" : "AVAILABLE"}</small>}<span className="public-payment-cell"><small>PAYMENT STATUS</small><span className={`public-payment ${player.payment_status === "Paid" ? "paid" : "pending"}`}>{player.payment_status === "Paid" ? "Paid" : "Pending"}</span></span>{!player.photo && <button className="upload-player-photo" onClick={() => { setPhotoTarget(player); setPhotoNotice(""); }}>Upload image</button>}</span></li>)}</ul></> : <p>No player registrations yet. Registered player names will appear here.</p>}<small>Names are shown publicly; contact and payment details stay private.</small></div>}<button type="button" className={`public-roster-button${audienceStatusVisible ? ' active' : ''}`} aria-expanded={audienceStatusVisible} aria-controls="audience-status-panel" onClick={toggleAudienceStatus}><Shirt size={17} />{audienceStatusVisible ? 'Hide Audience T-shirt status' : 'Check Audience T-shirt status'}<ArrowRight size={16} /></button>{audienceStatusVisible && <div className="registered-player-panel live-player-panel audience-status-panel" id="audience-status-panel" aria-live="polite">{audienceStatusLoading ? <p>Loading Audience T-shirt orders...</p> : audienceStatusError ? <p>{audienceStatusError}</p> : audienceOrders.length ? <><div className="player-panel-heading">AUDIENCE T-SHIRT ORDERS <span>{audienceOrders.length}</span></div><div className="public-player-list-head audience-status-head"><strong>NAME / SIZE</strong><strong>PAYMENT / T-SHIRT</strong></div><ul>{audienceOrders.map((order, index) => <li key={`${order.name}-${index}`}><div className="player-name-stack"><strong>{order.name}</strong><small>Size: {order.size || 'Not provided'}</small></div><span className="public-player-meta"><span className="public-payment-cell"><small>PAYMENT</small><span className={`public-payment ${order.payment_status === 'Paid' ? 'paid' : 'pending'}`}>{order.payment_status}</span></span><span className="public-payment-cell"><small>T-SHIRT</small><span className={`public-payment ${order.shirt_status === 'Issued' ? 'paid' : 'pending'}`}>{order.shirt_status}</span></span></span></li>)}</ul><small>Names and order status are public; contact and payment reference details stay private.</small></> : <p>No Audience T-shirt orders yet.</p>}</div>}<button type="button" className={`public-roster-button sponsor-status-toggle${sponsorStatusVisible ? ' active' : ''}`} aria-expanded={sponsorStatusVisible} aria-controls="sponsor-status-panel" onClick={toggleSponsorStatus}><Trophy size={17} />{sponsorStatusVisible ? 'Hide sponsor status' : 'Check sponsor status'}<ArrowRight size={16} /></button>{sponsorStatusVisible && <div className="registered-player-panel live-player-panel sponsor-status-panel" id="sponsor-status-panel" aria-live="polite">{sponsorStatusLoading ? <p>Loading sponsor status...</p> : sponsorStatusError ? <p>{sponsorStatusError}</p> : publicSponsors.length ? <><div className="player-panel-heading">SPONSORS & SUPPORT <span>{publicSponsors.length}</span></div><ul>{publicSponsors.map((sponsor, index) => <li key={`${sponsor.name}-${index}`}><div className="sponsor-status-identity">{sponsor.logo ? <img src={sponsor.logo} alt={`${sponsor.name} logo`} /> : <span>{sponsor.name.slice(0, 1).toUpperCase()}</span>}<div><strong>{sponsor.name}</strong><small>{sponsor.area}</small></div></div><span className="sponsor-status-support"><small>{sponsor.type}</small><strong>{sponsor.support}</strong></span></li>)}</ul><small>Thank you to our sponsors for supporting GNPL match day.</small></> : <p>No sponsors have been listed yet.</p>}</div>}</section>

      



      <section className="matchday wrap" id="schedule"><div className="matchday-left"><div className="section-tag">04 / SAVE THE FEELING</div><h2>THE CROWD.<br /><em>THE CRACK.</em><br />THE CHEER.</h2><p>One boundary can bring the whole neighbourhood to its feet. Get ready for a season worth showing up for.</p><a href="#teams" className="button button-lime">Meet the teams <ArrowRight size={17} /></a></div></section>

    </main>

    <footer className="footer"><div className="wrap footer-main"><a href="#home" className="brand"><span className="brand-mark"><Trophy size={21} /></span><span>GN<span className="brand-accent">PL</span><small>GODREJ NEST PREMIER LEAGUE</small></span></a><p>Arranged by<br /><strong>Godrej Nest Cultural Team</strong></p><a className="footer-top" href="#home">BACK TO TOP â†‘</a></div><div className="wrap footer-bottom"><span>Â© 2026 GNPL Â· GODREJ NEST PREMIER LEAGUE</span><button onClick={openAdmin}>Registration dashboard</button><span className="footer-credit"><small>WEBSITE CRAFTED BY</small><strong>Abhishek Hemant Sawant <em>(Mindhacker)</em></strong></span><span>PLAY WITH PRIDE <span className="lime">âœ³</span></span></div></footer>

    {modal && <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="dialog register-dialog" role="dialog" aria-modal="true" aria-labelledby="reg-title"><button className="close" onClick={() => setModal(null)} aria-label="Close"><X /></button><div className="dialog-icon">{modal.icon}</div><div className="section-tag">GNPL 2026 / {modal.key.toUpperCase()}</div><h2 id="reg-title">{modal.key === "Sponsor" ? <>Your support<br /><em>makes a difference.</em></> : <>Your place<br /><em>starts here.</em></>}</h2><p className="modal-entry-fee">{modal.key === 'Audience' ? 'Audience T-shirt price:' : modal.key === 'Sponsor' ? 'Sponsorship:' : 'Registration fee:'} <strong>{modal.fee}</strong></p>{!notice && !formBusy && <p className="registration-ready-note" role="status">Your form is ready. Complete the required fields, then select {modal.key === 'Sponsor' ? 'Send sponsorship offer' : 'Submit registration'}.</p>}{notice ? <div className={registrationSuccess ? "success-state" : "success-state error-state"}><span className="success-icon">{registrationSuccess ? <Check /> : <X />}</span><p>{notice}</p>{receipt && <div className="receipt-preview"><strong>Registration ID</strong><span>{receipt.id}</span><small>{receipt.name} ? {receipt.type} registration ? Payment pending verification</small><button type="button" className="receipt-download" onClick={downloadReceipt}><Download size={15} /> Download registration receipt</button></div>}<button className="button button-lime" onClick={() => { setModal(null); setNotice(''); }}>Done <ArrowRight size={16} /></button></div> : (modal.key === "Owner" || (modal.key === "Player" && clockNow >= new Date("2026-11-26T07:08:23Z").getTime()) || (modal.key === "Audience" && clockNow >= new Date("2026-11-26T07:08:23Z").getTime())) ? <div className="registration-closed-notice" role="status"><strong>Registrations are closed now.</strong><br />Please contact Abhishek From Cultural Team for Offline Registration.</div> : <form className="registration-form" onSubmit={submitRegistration} onInvalid={e => { e.target.dataset.touched = "true"; syncFieldError(e.target); }} onBlur={e => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) { e.target.dataset.touched = "true"; syncFieldError(e.target); } }} onInput={e => { setFormReady(e.currentTarget.checkValidity()); if (e.target.dataset.touched) syncFieldError(e.target); }}><a className="payment-qr-link" href="/payment-qr.jpeg" target="_blank" rel="noreferrer"><img src="/payment-qr.jpeg" alt={modal.key === "Sponsor" ? "GNPL UPI payment QR code for cash sponsorship" : "GNPL UPI payment QR code"} /><span>{modal.key === 'Sponsor' ? 'Scan to pay a cash sponsorship Â· in-kind sponsors can skip payment' : 'Scan to pay with any UPI app Â· tap to open QR'}</span></a><div className="form-grid"><label>Full name<input name="name" required placeholder="Your name" autoComplete="name" /><small className="field-error" role="alert" hidden></small></label><label>Mobile number<input name="phone" required inputMode="tel" placeholder="+91 00000 00000" autoComplete="tel" pattern="[+0-9\x20\x28\x29\x2d]{7,20}" /><small className="field-error" role="alert" hidden></small></label><label>Wing<input name="wing" required={modal.key !== 'Sponsor'} placeholder="e.g. A Wing" /><small className="field-error" role="alert" hidden></small></label><label>Flat No.<input name="flat_no" required={modal.key !== 'Sponsor'} placeholder="e.g. 1204" /><small className="field-error" role="alert" hidden></small></label>{modal.fields.map((f, i) => <label key={f}>{f === "Experience" && modal.key === "Player" ? "Cricket experience (years)" : f}{f === "Team Name" ? <><select name={`extra${i}`} required defaultValue="" aria-label={modal.key === "Player" ? "Team assignment" : "Team name"}><option value="" disabled>{modal.key === "Player" ? "Choose a team assignment" : "Choose your team"}</option>{teams.map(team => <option key={team.name} value={team.name}>{team.name}</option>)}</select></> : f === "Sponsorship area" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose what to support</option><option>Snacks &amp; refreshments</option><option>Cricket equipment</option><option>First aid &amp; safety</option><option>Ground &amp; match setup</option><option>Player support</option><option>Other</option></select> : f === "Sponsorship type" ? <select name={`extra${i}`} required value={sponsorContributionType} onChange={event => setSponsorContributionType(event.target.value)}><option value="Cash">Cash contribution</option><option value="In-kind">In-kind contribution</option></select> : f === "Contribution amount" ? <input name={`extra${i}`} type="number" inputMode="decimal" min="1" step="0.01" required={sponsorContributionType === "Cash"} placeholder="Amount in rupees" /> : f === "Contribution details" ? <input name={`extra${i}`} required={sponsorContributionType === "In-kind"} placeholder="Describe items or support" /> : f === "Organization name" ? <input name={`extra${i}`} placeholder="Business or sponsor name (optional)" /> : f === "Logo URL" ? <><input name={`extra${i}`} type="url" placeholder="https://? (optional)" /><small className="field-hint">Use a public HTTPS link to your logo image.</small></> : f === "Public showcase permission" ? <><select name={`extra${i}`} defaultValue="no"><option value="no">Do not feature my profile publicly</option><option value="yes">Yes, feature my name, logo, and support</option></select><small className="field-hint">Only sponsors who opt in will appear on the website.</small></> : f === "Playing role" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose your role</option><option value="Bowler">Bowler</option><option value="Batter">Batter</option></select> : f === "T-shirt Size" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose T-shirt size</option>{["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map(size => <option key={size} value={size}>{size}</option>)}</select> : f === "T-Shirt Number" ? <input name={`extra${i}`} type="number" inputMode="numeric" min="0" max="999" required placeholder="Your T-shirt number" /> : f === "Player category" ? <select name={`extra${i}`} required defaultValue=""><option value="" disabled>Choose Women or Kids</option><option value="Women">Women (16+) - &#8377;400</option><option value="Kids">Kids (8&#8211;15) - &#8377;300</option></select> : f === "Age" && modal.key === "Player" ? <><input name={`extra${i}`} type="number" inputMode="numeric" min="8" max="120" step="1" required placeholder="Your age" /><small className="field-hint">Women: 16+ &#183; Kids: 8&#8211;15</small></> : f === "Experience" && modal.key === "Player" ? <><input name={`extra${i}`} type="number" inputMode="numeric" min="0" max="80" step="1" required placeholder="0 for a beginner" /><small className="field-hint">Enter whole years of cricket experience. Beginners can enter 0; experience cannot exceed your age.</small></> : <input name={`extra${i}`} required placeholder={`Your ${f.toLowerCase()}`} />}<small className="field-error" role="alert" hidden></small></label>)}{modal.key === "Player" && <label className="full-field photo-upload">Player photo (required)<input type="file" accept="image/*" required onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setPhotoPreparing(true); setPhotoError(""); setNotice(""); try { setPlayerPhoto(await imageData(file)); } catch (error) { setPhotoError(error.message || "Could not optimize that photo. Please choose another image."); } finally { setPhotoPreparing(false); } }} />{playerPhoto && <img className="upload-preview" src={playerPhoto} alt="Player photo preview" />}<small className="field-hint photo-progress" aria-live="polite">{photoPreparing ? "Optimizing image for a faster upload..." : photoError || (playerPhoto ? "Photo optimized and ready to upload." : "Player photo is required. Upload the original photo at the highest resolution you have. We optimize it for a sharp player profile.")}</small></label>}<label className="full-field">Google Pay transaction ID (optional)<input name="payment" placeholder="Enter transaction ID if available" /><small className="field-error" role="alert" hidden></small></label><label className="full-field">{modal.key === "Sponsor" ? "Payment time (cash only)" : "Google Pay payment time"}<input name="payment_time" type="time" step="60" required={modal.key !== "Sponsor" || sponsorContributionType === "Cash"} aria-label="Google Pay payment time" /><small className="field-error" role="alert" hidden></small><small className="field-hint">{modal.key === "Sponsor" && sponsorContributionType === "In-kind" ? "No payment needed for in-kind offers." : "Choose the exact time shown in your payment app (24-hour format). Transaction ID is optional."}</small></label></div>{formBusy && <p className="submission-progress" role="status"><span className="progress-spinner" /> {modal.key === 'Audience' ? 'Submitting your T-shirt order. Please keep this page open.' : 'Sending registration and optimized photo. Please keep this page open.'}</p>}<button className="button button-lime submit-button" disabled={formBusy || photoPreparing || !formReady || (modal.key === 'Player' && !playerPhoto)}>{photoPreparing ? 'Preparing photo...' : formBusy ? (modal.key === 'Sponsor' ? 'Sending sponsorship...' : 'Submitting...') : modal.key === 'Sponsor' ? 'Send sponsorship offer' : 'Submit registration'} <ArrowRight size={16} /></button><p className="form-privacy">{modal.key === 'Sponsor' ? 'The organisers will contact you to confirm sponsorship details. Cash pledges remain pending until verified; in-kind offers do not require payment.' : modal.key === 'Audience' ? 'Your order details stay private. Payment remains pending until verified.' : 'Your name will appear in the public GNPL player list. Your contact and payment details remain private; payment is marked pending until verified.'}</p></form>}</div></div>}

    <AdminDashboard visible={admin} dashboard={adminDashboardProps} />
    {editTarget && createPortal(<div className="overlay admin-sub-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && !editBusy && setEditTarget(null)}><section className="dialog registration-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="registration-edit-title"><button className="close" onClick={() => !editBusy && setEditTarget(null)} aria-label="Close"><X /></button><div className="section-tag">ADMIN / EDIT REGISTRATION</div><h2 id="registration-edit-title">Edit <em>details.</em></h2><p className="edit-record-type">{editTarget.type} registration Â· ID {editTarget.id}</p><form onSubmit={saveRegistrationEdit} className="registration-edit-form"><div className="form-grid"><label>Full name<input name="name" required defaultValue={editTarget.name || ''} /></label><label>Mobile number<input name="phone" type="tel" required defaultValue={editTarget.phone || ''} /></label><label>Email<input name="email" type="email" defaultValue={editTarget.email || ''} /></label><label>Payment reference<input name="payment_reference" defaultValue={editTarget.payment_reference || ''} /></label><label>Payment status<select name="payment_status" defaultValue={editTarget.payment_status === 'Paid' ? 'Paid' : 'Pending'}><option value="Pending">Pending</option><option value="Paid">Paid</option></select></label>{Object.entries(editTarget.details || {}).filter(([key]) => key !== 'photo').map(([key, value]) => <label key={key}>{key.replaceAll('_', ' ').replaceAll('-', ' ')}{key === 'public_showcase_permission' ? <select name={`detail:${key}`} defaultValue={value === 'yes' ? 'yes' : 'no'}><option value="no">No public showcase</option><option value="yes">Approved for public showcase</option></select> : <input name={`detail:${key}`} type={key === 'logo_url' ? 'url' : 'text'} defaultValue={String(value ?? '')} />}</label>)}{editTarget.type === 'Player' && <label className="full-field photo-upload">Player photo<input type="file" accept="image/*" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { setEditPhoto(await imageData(file)); setNotice('Photo ready to upload when you save.'); } catch (error) { setNotice(error.message || 'Could not prepare that photo.'); } }} />{(editPhoto || editTarget.details?.photo) && <img className="upload-preview" src={editPhoto || editTarget.details.photo} alt="Player photo preview" />}<small className="field-hint">Choose a new photo to replace the current one.</small></label>}</div>{notice && <p className="notice" role="status">{notice}</p>}<div className="registration-edit-actions"><button type="button" className="cancel-edit" onClick={() => setEditTarget(null)} disabled={editBusy}>Cancel</button><button className="button button-lime" disabled={editBusy}>{editBusy ? 'Savingâ€¦': 'Save changes'} <Check size={16} /></button></div></form></section></div>, document.body)}    {photoTarget && <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setPhotoTarget(null)}><section className="dialog photo-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-upload-title"><button className="close" onClick={() => setPhotoTarget(null)} aria-label="Close"><X /></button><div className="section-tag">REGISTERED PLAYER PHOTO</div><h2 id="photo-upload-title">Add your <em>photo.</em></h2><p>For ${photoTarget.name}. Enter the phone number used for this player registration so we can match the photo to the right player.</p><form onSubmit={submitPlayerPhoto} className="player-profile-form"><label>Registered mobile number<input type="tel" required value={photoPhone} onChange={e => setPhotoPhone(e.target.value)} placeholder="Enter registered phone number" /></label><label>Choose a player image<input type="file" accept="image/*" required onChange={async e => { const file=e.target.files?.[0]; if(file) { try { setPhotoUpload(await imageData(file)); } catch { setPhotoNotice("Could not read that image. Choose another file."); } } }} /></label>{photoUpload && <img className="upload-preview" src={photoUpload} alt="Selected player image" />}{photoNotice && <p className="notice" role="status">{photoNotice}</p>}<button className="button button-lime" disabled={photoBusy || !photoUpload}>{photoBusy ? "Uploading..." : "Upload image"} <Upload size={16}/></button></form></section></div>}
    {selectedTeam && <div className="overlay team-roster-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && setSelectedTeam(null)}><section className="dialog team-roster-dialog" role="dialog" aria-modal="true" aria-labelledby="team-roster-title" style={{'--team-accent': selectedTeam.color}}><button className="close" onClick={() => setSelectedTeam(null)} aria-label="Close team roster"><X /></button><div className="section-tag">GNPL 2026 / TEAM ROSTER</div><div className="team-roster-modal-heading"><img className="team-logo team-artwork" src={selectedTeam.logo} alt={`${selectedTeam.name} logo`} style={{'--team-accent': selectedTeam.color}} /><div><h2 id="team-roster-title">{selectedTeam.name}</h2><p className="team-owner-name">Owner: <strong>{selectedTeam.owner}</strong></p><p><Trophy size={14} /> Captain: <strong>{selectedTeamCaptain?.name || selectedTeam.captain}</strong></p></div></div><div className="team-roster-actions"><button type="button" className="team-share-button" onClick={() => copyTeamLink(selectedTeam)}><Share2 size={15} /> Share team</button>{teamShareNotice && <small role="status">{teamShareNotice}</small>}</div>{(() => { const members = registeredPlayers.filter(player => player.team_name === selectedTeam.name); return <>{selectedTeamCaptain && <section className="captain-profile" aria-label="Team captain profile"><div className="captain-profile-main">{selectedTeamCaptain.photo ? <img src={selectedTeamCaptain.photo} alt={`${selectedTeamCaptain.name}, team captain`} /> : <span className="captain-profile-avatar"><Users size={24} /></span>}<div><small>TEAM CAPTAIN</small><h3>{selectedTeamCaptain.name}</h3><p>{selectedTeamCaptain.role || ''}{selectedTeamCaptain.playerCategory ? ` Â· ${selectedTeamCaptain.playerCategory}` : ''}</p></div><button type="button" onClick={() => openPlayerDisplay({...selectedTeamCaptain, player_category:selectedTeamCaptain.playerCategory, player_number:selectedTeamCaptain.playerNumber, player_grade:selectedTeamCaptain.grade, playing_role:selectedTeamCaptain.role})}>View profile</button></div><div className="captain-profile-stats"><span><small>EXPERIENCE</small><strong>{selectedTeamCaptain.experience ?? 'â€”'} yrs</strong></span><span><small>MATCHES</small><strong>{selectedTeamCaptain.matches ?? 0}</strong></span><span><small>RUNS</small><strong>{selectedTeamCaptain.runs ?? 0}</strong></span><span><small>WICKETS</small><strong>{selectedTeamCaptain.wickets ?? 0}</strong></span></div></section>}<div className="team-roster-count"><Users size={17} /> {members.length} {members.length === 1 ? 'player' : 'players'} assigned</div>{members.length ? <ul className="team-roster-members">{members.map((player, index) => <li key={`${player.id || player.name}-${index}`}><span className="team-roster-member-name">{player.photo ? <img src={player.photo} alt="" /> : <span className="team-roster-avatar"><Users size={15} /></span>}<strong>{player.name}</strong></span>{player.role && <small className="player-role-badge">{player.role}</small>}</li>)}</ul> : <div className="team-roster-empty"><Users size={24} /><p>No players have been assigned to this team yet.</p></div>}</>; })()}</section></div>}
    {selectedPlayer && createPortal(<PlayerProfile player={selectedPlayer} onClose={() => setSelectedPlayer(null)} onSave={savePlayerProfile} onPhotoChange={updateSelectedPlayerPhoto} profileBusy={profileBusy} onOpenDisplay={() => openPlayerDisplay(selectedPlayer)} />, document.body)}
    {deleteTarget && createPortal(<div className="confirm-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && !deleteBusy && setDeleteTarget(null)}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="section-tag">REMOVE REGISTRATION</div><h2 id="delete-title">Delete this <em>entry?</em></h2><p>Remove <strong>{deleteTarget.name}</strong> ({deleteTarget.type}) from the GNPL registration list? This action cannot be undone.</p><div className="confirm-actions"><button className="cancel-delete" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>Keep registration</button><button className="confirm-delete" onClick={deleteRegistration} disabled={deleteBusy}>{deleteBusy ? 'Deletingâ€¦' : <><Trash2 size={15} /> Delete registration</>}</button></div></section></div>, document.body)}
  </div>;
}

export default App;
