import React, { useState } from 'react';
import { ArrowRight, Pencil, X } from 'lucide-react';

const hasValue = value => value !== undefined && value !== null && String(value).trim() !== '';

export default function PlayerProfile({ player, onClose, onSave, onPhotoChange, profileBusy }) {
  const [editing, setEditing] = useState(false);
  const category = player.player_category || player.category;
  const role = player.playing_role || player.role;
  const wing = player.details?.wing || player.wing;
  const flat = player.details?.flat_no || player.flat_no;
  const address = player.player_address || (wing && flat ? `${wing} / ${flat}` : player.apartment);
  const subtitle = [category, role].filter(hasValue).join(' / ');
  const facts = [
    ['Player number', player.player_number],
    ['Player name', player.name],
    ['Player role', role],
    ['Player address', address],
    ['Contact number', player.adminProfile ? player.phone : null],
  ].filter(([, value]) => hasValue(value));
  const metrics = [
    ['Age', player.age], ['Experience', player.experience], ['Batting style', player.batting],
    ['Bowling style', player.bowling], ['Matches', player.matches], ['Runs', player.runs],
    ['Wickets', player.wickets], ['Team', player.team_name],
  ].filter(([, value]) => hasValue(value));

  return (
    <div className="overlay player-detail-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="dialog player-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="player-detail-title">
        <button className="close" onClick={onClose} aria-label="Close player profile"><X /></button>
        <div className="player-profile-topline">
          <span className="player-profile-kicker">GNPL 2026 / PLAYER PRESENTATION</span>
          <span className="player-profile-credit">AN INITIATIVE BY <strong>GODREJ NEST CULTURAL TEAM</strong></span>
        </div>
        <div className={`player-detail-head ${player.photo ? 'has-photo' : 'no-photo'}`}>
          {player.photo
            ? <img src={player.photo} alt={`${player.name} player portrait`} />
            : <div className="player-photo-missing">PLAYER IMAGE<br />NOT UPDATED</div>}
          <div>
            <h2 id="player-detail-title">{player.name}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        {facts.length > 0 && <div className="player-poster-facts">
          {facts.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
        </div>}

        <div className="profile-bidding-status" aria-label="Live player presentation. Owners are bidding verbally.">
          <span className="profile-bidding-pulse" />
          <span className="profile-bidding-label">LIVE PLAYER PRESENTATION</span>
          <strong>OWNER BIDDING · VERBAL</strong>
        </div>

        {player.adminProfile && editing ? (
          <form className="player-profile-form" onSubmit={onSave}>
            <label className="full-field">Player photo
              <input type="file" accept="image/*" onChange={event => onPhotoChange(event.target.files?.[0])} />
            </label>
            <div className="form-grid">
              {[
                ['player_number', 'Player number'], ['player_address', 'Player address'], ['age', 'Age'],
                ['player_category', 'Category'], ['playing_role', 'Playing role'], ['experience', 'Experience'],
                ['batting', 'Batting style'], ['bowling', 'Bowling style'], ['matches', 'Matches'],
                ['runs', 'Runs'], ['wickets', 'Wickets'], ['team_name', 'Team'],
              ].map(([key, label]) => <label key={key}>{label}<input name={key} defaultValue={player[key] ?? ''} /></label>)}
            </div>
            <button className="button button-lime" disabled={profileBusy}>
              {profileBusy ? 'Saving...' : 'Save player profile'} <ArrowRight size={16} />
            </button>
            <button className="profile-cancel-edit" type="button" onClick={onClose} disabled={profileBusy}>Close without saving</button>
          </form>
        ) : (
          <>
            {metrics.length > 0 && <div className="player-metrics">
              {metrics.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
            </div>}
            <small className={player.payment_status === 'Paid' ? 'public-payment paid' : 'public-payment pending'}>
              {player.payment_status === 'Paid' ? 'Payment completed - approved by admin' : 'Payment not done - awaiting admin approval'}
            </small>
            {player.adminProfile && <button className="player-edit-details-button" onClick={() => setEditing(true)}>
              Edit details <Pencil size={15} />
            </button>}
          </>
        )}
      </section>
    </div>
  );
}
