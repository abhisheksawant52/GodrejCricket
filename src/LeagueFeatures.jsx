import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Megaphone, Plus, Save, Share2, Trash2, Download } from 'lucide-react';
import communitySponsors from './communitySponsors.js';

const emptyContent = { schedule: [], announcements: [] };
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function SponsorShowcase() {
  const [sponsors, setSponsors] = useState([]);
  const [sponsorsLoaded, setSponsorsLoaded] = useState(false);
  useEffect(() => {
    fetch('/api/sponsors').then(response => response.ok ? response.json() : { sponsors: [] }).then(data => setSponsors(Array.isArray(data.sponsors) ? data.sponsors : [])).catch(() => setSponsors([])).finally(() => setSponsorsLoaded(true));
  }, []);
  const approvedCommunitySponsors = communitySponsors.filter(sponsor => sponsor.sponsorshipConfirmed === true && sponsor.publicShowcasePermission === true).map(sponsor => ({ ...sponsor, flatNo: sponsor.flatNo || sponsor.area, support: sponsor.sponsorshipArea || sponsor.support }));
  const named = new Set(approvedCommunitySponsors.map(sponsor => sponsor.name.toLowerCase()));
  const listedSponsors = [...approvedCommunitySponsors, ...sponsors.filter(sponsor => !named.has(sponsor.name.toLowerCase()))];
  return <section className={`sponsor-showcase wrap${sponsorsLoaded ? ' sponsors-loaded' : ''}`} id="sponsors" aria-labelledby="sponsor-showcase-title">
    <div className="sponsor-showcase-heading">
      <div><h2 id="sponsor-showcase-title">Our <em>sponsors.</em></h2></div>
    </div>
    {listedSponsors.length ? <div className="sponsor-showcase-grid">{listedSponsors.map((sponsor, index) => <article className="sponsor-showcase-card" key={`${sponsor.name}-${index}`}>
      <div className="sponsor-showcase-logo">{sponsor.logo && <img src={sponsor.logo} alt={`${sponsor.name} logo`} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}<span aria-hidden="true">{sponsor.name.slice(0, 1).toUpperCase()}</span></div>
      <div className="sponsor-showcase-main"><strong>{sponsor.name}</strong><small>FLAT NO. {sponsor.flatNo || 'Not provided'}</small></div>
      <div className="sponsor-showcase-support"><small>SPONSORING</small><strong>{sponsor.support || 'Match-day support'}</strong></div>
    </article>)}</div> : <p className="sponsor-showcase-empty">Sponsor listings will appear here.</p>}
  </section>;
}

export function LeagueFeatures({ admin = false, adminPass = '', rows = [], teams = [], players = [] }) {
  const [content, setContent] = useState(emptyContent);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      const response = await fetch('/api/content');
      if (!response.ok) return;
      const data = await response.json();
      setContent({ schedule: Array.isArray(data.schedule) ? data.schedule : [], announcements: Array.isArray(data.announcements) ? data.announcements : [] });
    } catch { /* Keep the page usable when the content API is offline. */ }
  };
  useEffect(() => { load(); }, []);
  const save = async next => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass }, body: JSON.stringify(next) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save.');
      setContent({ schedule: data.schedule || [], announcements: data.announcements || [] }); setMessage('Saved. Public updates are live.');
    } catch (error) { setMessage(error.message || 'Could not save updates.'); }
    finally { setBusy(false); }
  };
  const editFixture = (id, key, value) => setContent(c => ({ ...c, schedule: c.schedule.map(f => f.id === id ? { ...f, [key]: value } : f) }));
  const editAnnouncement = (id, key, value) => setContent(c => ({ ...c, announcements: c.announcements.map(a => a.id === id ? { ...a, [key]: value } : a) }));
  const insights = useMemo(() => {
    const registrations = rows.filter(row => row.type === 'Player');
    const cats = ['Men', 'Women', 'Kids'].map(category => ({ category, count: registrations.filter(r => r.details?.player_category === category).length }));
    const days = new Map();
    registrations.forEach(row => { const key = row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Unknown'; days.set(key, (days.get(key) || 0) + 1); });
    const trend = [...days.entries()].slice(-10);
    return { registrations, cats, trend };
  }, [rows]);
  const maximum = Math.max(1, ...insights.trend.map(([, n]) => n));
  const standings = useMemo(() => {
    const table = new Map();
    content.schedule.filter(f => f.status === 'Completed' && f.winner).forEach(f => {
      for (const name of [f.home, f.away]) if (!table.has(name)) table.set(name, { name, played: 0, won: 0, lost: 0, tied: 0, points: 0 });
      if (f.winner === 'Tie') { const home = table.get(f.home), away = table.get(f.away); home.played++; away.played++; home.tied++; away.tied++; home.points++; away.points++; return; }
      const winner = table.get(f.winner); const loserName = f.winner === f.home ? f.away : f.home; const loser = table.get(loserName);
      if (!winner || !loser) return;
      winner.played++; winner.won++; winner.points += 2; loser.played++; loser.lost++;
    });
    return [...table.values()].sort((a, b) => b.points - a.points || b.won - a.won || a.name.localeCompare(b.name));
  }, [content.schedule]);
  const addFixture = () => setContent(c => ({ ...c, schedule: [...c.schedule, { id: makeId(), date: '', time: '', home: '', away: '', venue: '', status: 'Upcoming', homeScore: '', awayScore: '', winner: '', result: '' }] }));
  const addAnnouncement = () => setContent(c => ({ ...c, announcements: [...c.announcements, { id: makeId(), title: '', message: '', date: new Date().toISOString().slice(0, 10), active: true }] }));
  return <>
    <section className="league-updates wrap" aria-label="Match schedule and announcements">
      <div className="league-updates-heading"><div><span className="section-tag"><CalendarDays size={14} /> GNPL 2026 / LEAGUE UPDATES</span><h2>Fixtures & <em>updates.</em></h2></div></div>
      <div className="league-updates-grid">
        <section className="league-feature-panel"><h3><CalendarDays size={18} /> Match schedule & results</h3>{content.schedule.length ? <div className="league-fixture-list">{content.schedule.slice().sort((a,b) => a.date.localeCompare(b.date)).map(f => <article className="league-fixture" key={f.id}><div><small>{f.date}{f.time ? ` · ${f.time}` : ''} · {f.venue || 'Venue to be announced'}</small><strong>{f.home} <span>vs</span> {f.away}</strong>{f.status === 'Completed' && <p>{f.homeScore || '—'} : {f.awayScore || '—'}{f.result ? ` · ${f.result}` : ''}</p>}</div><b className={f.status === 'Completed' ? 'fixture-complete' : ''}>{f.status}</b></article>)}</div> : <p className="league-empty">Match fixtures and team timings are yet to be announced. Please check back soon.</p>}
          {standings.length > 0 && <><h4>Standings</h4><div className="table-wrap"><table><thead><tr><th>Team</th><th>P</th><th>W</th><th>T</th><th>L</th><th>Pts</th></tr></thead><tbody>{standings.map(s => <tr key={s.name}><td>{s.name}</td><td>{s.played}</td><td>{s.won}</td><td>{s.tied}</td><td>{s.lost}</td><td>{s.points}</td></tr>)}</tbody></table></div></>}
        </section>
        <section className="league-feature-panel"><h3><Megaphone size={18} /> Announcements</h3>{content.announcements.filter(a => a.active).length ? <div className="league-announcements">{content.announcements.filter(a => a.active).map(a => <article key={a.id}><small>{a.date}</small><strong>{a.title}</strong><p>{a.message}</p></article>)}</div> : <p className="league-empty">Announcements are yet to be made. Please check back soon.</p>}</section>
      </div>
    </section>
    {admin && createPortal(editorOpen ? <div className="league-admin-overlay"><section className="admin-league-content"><button className="league-admin-close" type="button" onClick={() => setEditorOpen(false)} aria-label="Close league content editor">Ã—</button><header><div className="section-tag">ADMIN / LEAGUE CONTENT</div><h3>Fixtures & announcements</h3></header>
      <p className="league-editor-help">Change an existing match below or add a new fixture. Save updates to publish the schedule on the website.</p>
      <div className="admin-content-actions"><button type="button" onClick={addFixture}><Plus size={14} /> Add fixture</button><button type="button" onClick={addAnnouncement}><Plus size={14} /> Add announcement</button><button type="button" disabled={busy} onClick={() => save(content)}><Save size={14} /> {busy ? 'Savingâ€¦' : 'Save updates'}</button></div>
      {content.schedule.map(f => <div className="admin-content-row" key={f.id}><input type="date" aria-label="Fixture date" value={f.date} onChange={e => editFixture(f.id, 'date', e.target.value)} /><input aria-label="Fixture time" placeholder="Time (e.g. 9:00 AM)" value={f.time} onChange={e => editFixture(f.id, 'time', e.target.value)} /><input aria-label="Home team" placeholder="Home team" value={f.home} onChange={e => editFixture(f.id, 'home', e.target.value)} /><input aria-label="Away team" placeholder="Away team" value={f.away} onChange={e => editFixture(f.id, 'away', e.target.value)} /><input aria-label="Venue" placeholder="Venue" value={f.venue} onChange={e => editFixture(f.id, 'venue', e.target.value)} /><select aria-label="Fixture status" value={f.status} onChange={e => editFixture(f.id, 'status', e.target.value)}><option>Upcoming</option><option>Completed</option></select>{f.status === 'Completed' && <><input aria-label="Home score" placeholder="Home score" value={f.homeScore} onChange={e => editFixture(f.id, 'homeScore', e.target.value)} /><input aria-label="Away score" placeholder="Away score" value={f.awayScore} onChange={e => editFixture(f.id, 'awayScore', e.target.value)} /><select aria-label="Winner" value={f.winner} onChange={e => editFixture(f.id, 'winner', e.target.value)}><option value="">Choose winner</option><option value={f.home}>{f.home || 'Home team'}</option><option value={f.away}>{f.away || 'Away team'}</option><option value="Tie">Tie / no result</option></select></>}<button type="button" className="remove-content" aria-label="Remove fixture" onClick={() => setContent(c => ({ ...c, schedule: c.schedule.filter(x => x.id !== f.id) }))}><Trash2 size={15} /></button></div>)}
      {content.announcements.map(a => <div className="admin-content-row announcement-edit" key={a.id}><input type="date" aria-label="Announcement date" value={a.date} onChange={e => editAnnouncement(a.id, 'date', e.target.value)} /><input aria-label="Announcement title" placeholder="Title" value={a.title} onChange={e => editAnnouncement(a.id, 'title', e.target.value)} /><textarea aria-label="Announcement message" placeholder="Message" value={a.message} onChange={e => editAnnouncement(a.id, 'message', e.target.value)} /><label><input type="checkbox" checked={a.active} onChange={e => editAnnouncement(a.id, 'active', e.target.checked)} /> Published</label><button type="button" className="remove-content" aria-label="Remove announcement" onClick={() => setContent(c => ({ ...c, announcements: c.announcements.filter(x => x.id !== a.id) }))}><Trash2 size={15} /></button></div>)}
      {message && <p role="status" className="league-save-message">{message}</p>}
      <div className="registration-insights"><div><span className="section-tag">REGISTRATION INSIGHTS</span><h3>{insights.registrations.length} player registrations</h3></div><div className="insight-category-grid">{insights.cats.map(item => <div key={item.category}><small>{item.category}</small><strong>{item.count}</strong></div>)}</div><div className="insight-trend" aria-label="Player registrations by registration date">{insights.trend.map(([day, count]) => <div key={day} title={`${count} registrations`}><span style={{ height: `${Math.max(8, count / maximum * 100)}%` }} /><small>{day}</small></div>)}</div><button type="button" className="export-button" onClick={() => { const csv = ['Date,Players', ...insights.trend.map(([day, count]) => `"${day}",${count}`)].join('\r\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'gnpl-registration-insights.csv'; link.click(); URL.revokeObjectURL(link.href); }}><Download size={14} /> Export trend CSV</button></div>
    </section></div> : <button className="league-admin-reopen" type="button" onClick={() => setEditorOpen(true)}>Manage fixtures & announcements</button>, document.body)}
  </>;
}

export function TeamShareGallery({ teams = [], players = [] }) {
  return <section className="team-share-gallery wrap" aria-label="Shareable team cards"><div className="section-tag">GNPL 2026 / SHARE THE TEAMS</div><h2>Take your team <em>everywhere.</em></h2><div className="team-share-gallery-grid">{teams.map(team => <article key={team.name} style={{ '--team-accent': team.color }}><img src={team.logo} alt="" /><div><strong>{team.name}</strong><small>{players.filter(player => player.team_name === team.name).length} players &middot; {team.owner}</small></div><TeamShareCard team={team} players={players.filter(player => player.team_name === team.name)} /></article>)}</div></section>;
}

export function TeamShareCard({ team, players = [] }) {
  const [status, setStatus] = useState('');
  const createCard = async () => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d'); const gradient = ctx.createLinearGradient(0, 0, 1200, 630); gradient.addColorStop(0, '#17091f'); gradient.addColorStop(1, team.color || '#442050');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1200, 630); ctx.strokeStyle = team.color || '#b2f54a'; ctx.lineWidth = 8; ctx.strokeRect(24, 24, 1152, 582);
    ctx.fillStyle = '#b2f54a'; ctx.font = 'bold 24px Arial'; ctx.fillText('GNPL 2026  /  TEAM ROSTER', 70, 82);
    ctx.fillStyle = '#fff4f8'; ctx.font = 'bold 54px Arial'; ctx.fillText(team.name, 70, 166, 1040);
    ctx.fillStyle = team.color || '#b2f54a'; ctx.font = 'bold 21px Arial'; ctx.fillText(`${(team.category || 'GNPL').toUpperCase()} TEAM`, 70, 211);
    ctx.fillStyle = '#8fe9ee'; ctx.font = '26px Arial'; ctx.fillText(`Owner: ${team.owner || '—'}  ·  Captain: ${team.captain || 'To be announced'}`, 70, 253, 1060);
    ctx.fillStyle = '#fff4f8'; ctx.font = 'bold 24px Arial'; ctx.fillText(`PLAYERS  ·  ${players.length}`, 70, 311);
    ctx.font = '22px Arial'; players.slice(0, 10).forEach((player, index) => ctx.fillText(`${index + 1}. ${player.name}${player.role ? `  —  ${player.role}` : ''}`, 74 + (index > 4 ? 540 : 0), 356 + (index % 5) * 42, 500));
    ctx.fillStyle = '#d5bacf'; ctx.font = '18px Arial'; ctx.fillText('Godrej Nest Premier League', 70, 566);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create the team card.');
    const file = new File([blob], `${team.short || 'team'}-gnpl-2026.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ title: `${team.name} · GNPL 2026`, text: 'Meet the team.', files: [file] });
    else { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url); }
    setStatus('Team card ready to share.');
  };
  return <button type="button" className="team-share-card-button" onClick={() => createCard().catch(error => setStatus(error.message))}><Share2 size={15} /> Create share card{status && <small role="status">{status}</small>}</button>;
}
