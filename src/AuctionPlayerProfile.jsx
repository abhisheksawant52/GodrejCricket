import React from 'react';
import { Activity, BadgeIndianRupee, CalendarDays, CircleUserRound, Clock3, ShieldCheck, X } from 'lucide-react';

const value = item => item === null || item === undefined || String(item).trim() === '' ? '—' : item;
const money = amount => `₹ ${Number(amount || 0).toLocaleString('en-IN')}`;

export default function AuctionPlayerProfile({ player, onClose, currentBid, activeTeam, team, state }) {
  if (!player) return null;
  const stats = [
    ['Matches', player.matches], ['Runs', player.runs], ['Wickets', player.wickets],
    ['Batting style', player.batting], ['Bowling style', player.bowling], ['Experience', player.experience ? `${player.experience} years` : null],
    ['Age', player.age ? `${player.age} years` : null], ['Player number', player.player_number || player.playerNumber],
    ['Address', player.player_address || player.address || player.details?.wing || player.wing],
  ].filter(([, item]) => value(item) !== '—');
  const status = state || player.status || 'Available';

  return <div className="auction-profile-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="auction-player-profile" role="dialog" aria-modal="true" aria-labelledby="auction-profile-name">
      <button className="auction-profile-close" onClick={onClose} aria-label="Close player profile"><X size={20}/></button>
      <div className="auction-profile-cover"><span className="auction-profile-orbit orbit-one"/><span className="auction-profile-orbit orbit-two"/><div className="auction-profile-kicker"><i/> GNPL · PLAYER DOSSIER</div><div className="auction-profile-portrait">{player.photo ? <img src={player.photo} alt={`${player.name} portrait`}/> : <span>{String(player.name || 'Player').split(/\s+/).map(part => part[0]).slice(0,2).join('').toUpperCase()}</span>}<i><ShieldCheck size={17}/></i></div><span className="auction-profile-lot">LOT #{player.lot || '—'}</span></div>
      <div className="auction-profile-content"><div className="auction-profile-heading"><div><p>{String(player.category || 'PLAYER').toUpperCase()} CATEGORY · {String(player.role || player.playing_role || 'ALL ROUNDER').toUpperCase()}</p><h2 id="auction-profile-name">{player.name}</h2><span className="auction-profile-state"><i/>{status}{player.team || player.team_name ? ` · ${player.team || player.team_name}` : ''}</span></div><div className="auction-profile-price"><small>{status === 'Sold' ? 'SOLD FOR' : status === 'In Auction' ? 'CURRENT BID' : 'BASE PRICE'}</small><b>{money(status === 'Sold' ? player.soldPrice : status === 'In Auction' ? currentBid : player.basePrice)}</b>{activeTeam && status === 'In Auction' && <span>Leading · {activeTeam}</span>}</div></div>
        <div className="auction-profile-stats"><article><BadgeIndianRupee/><small>BASE PRICE</small><b>{money(player.basePrice)}</b></article><article><Activity/><small>RUNS</small><b>{value(player.runs)}</b></article><article><ShieldCheck/><small>WICKETS</small><b>{value(player.wickets)}</b></article><article><CalendarDays/><small>MATCHES</small><b>{value(player.matches)}</b></article></div>
        <div className="auction-profile-details"><h3><CircleUserRound size={16}/> Player details</h3><div>{stats.map(([label,item])=><p key={label}><small>{label}</small><b>{value(item)}</b></p>)}</div></div>
        <footer><span><Clock3 size={15}/> Live auction profile</span><button onClick={onClose}>Done</button></footer>
      </div>
    </section>
  </div>;
}
