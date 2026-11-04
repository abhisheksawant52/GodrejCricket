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
  const profileRows = [
    ['Player number', player.player_number], ['Player address', address], ['Age', player.age],
    ['Experience', player.experience], ['Batting style', player.batting], ['Bowling style', player.bowling],
    ['Matches', player.matches], ['Runs', player.runs], ['Wickets', player.wickets],
    ['Team', player.team_name], ['Contact number', player.adminProfile ? player.phone : null],
  ].filter(([, value]) => hasValue(value));

  return (
    <div className="overlay player-detail-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="tournament-atmosphere" aria-hidden="true">
        <div className="auction-bid-card auction-bid-left"><span>GNPL AUCTION</span><strong>OWNERS<br />ON THE BID</strong><i>BID</i></div>
        <div className="auction-bid-card auction-bid-right"><span>AUCTION FLOOR</span><strong>PLAYER<br />PICKED!</strong><i>🏏</i></div>
        <div className="audience-cheer-label"><span className="cheer-live-dot" /> THE NEST IS CHEERING</div>
        <svg className="audience-silhouettes" viewBox="0 0 1200 170" preserveAspectRatio="xMidYMax slice">
          <g className="cheering-person person-one"><circle cx="90" cy="83" r="19"/><path d="M58 170v-36l-22-27 13-9 28 22 10-27 13-38 14 5-7 42 18-35 14 7-17 47 26 18v31z"/></g>
          <g className="cheering-person person-two"><circle cx="255" cy="93" r="16"/><path d="M228 170v-35l-19-29 12-8 26 22 9-22 14-34 13 6-7 38 19-30 12 8-19 42 21 20v22z"/></g>
          <g className="cheering-person person-three"><circle cx="438" cy="76" r="21"/><path d="M402 170v-38l-25-33 13-10 29 25 12-31 14-42 15 5-8 44 22-35 13 9-21 49 27 19v38z"/></g>
          <g className="cheering-person person-four"><circle cx="623" cy="91" r="17"/><path d="M594 170v-39l-20-27 12-9 26 20 7-27 12-38 14 5-5 43 18-34 14 8-19 47 22 20v31z"/></g>
          <g className="cheering-person person-five"><circle cx="803" cy="78" r="20"/><path d="M769 170v-40l-24-32 13-10 29 25 10-28 15-39 14 6-7 40 20-32 13 8-20 46 25 21v35z"/></g>
          <g className="cheering-person person-six"><circle cx="984" cy="92" r="16"/><path d="M957 170v-37l-19-29 12-8 25 22 8-25 14-36 13 6-6 39 18-31 12 8-18 43 22 22v26z"/></g>
          <g className="cheering-person person-seven"><circle cx="1130" cy="79" r="20"/><path d="M1096 170v-39l-24-33 13-9 29 24 10-29 15-39 14 6-7 41 21-33 13 8-21 47 25 22v34z"/></g>
        </svg>
      </div>
      <section className="dialog player-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="player-detail-title">
        <button className="close" onClick={onClose} aria-label="Close player profile"><X /></button>
        <div className="player-profile-topline">
          <span className="player-profile-kicker">GNPL 2026 / PLAYER PRESENTATION</span>
          <span className="player-profile-credit">AN INITIATIVE BY <strong>GODREJ NEST CULTURAL TEAM</strong></span>
        </div>
        <article className="player-showcase-poster">
          <div className="player-showcase-photo">
            {player.photo
              ? <img src={player.photo} alt={`${player.name} player portrait`} decoding="async" fetchPriority="high" />
              : <div className="player-photo-missing">PLAYER IMAGE<br />NOT UPDATED</div>}
            <span className="player-photo-ribbon">PLAYER PROFILE</span>
          </div>
          <div className="player-showcase-info">
            <div className="player-showcase-kicker">GNPL 2026 <span>PLAYER CARD</span></div>
            <h2 id="player-detail-title">{player.name}</h2>
            {subtitle && <p className="player-showcase-subtitle">{subtitle}</p>}
            {profileRows.length > 0 && <div className="player-showcase-stats">
              {profileRows.map(([label, value]) => <div className="player-showcase-stat" key={label}>
                <span>{label}</span><strong>{value}</strong>
              </div>)}
            </div>}
            <div className="profile-bidding-status" aria-label="Live player presentation. Owners are bidding verbally.">
              <span className="profile-bidding-pulse" />
              <span className="profile-bidding-label">LIVE PLAYER PRESENTATION</span>
              <strong>OWNER BIDDING · VERBAL</strong>
            </div>
            <small className={player.payment_status === 'Paid' ? 'public-payment paid' : 'public-payment pending'}>
              {player.payment_status === 'Paid' ? 'Payment completed - approved by admin' : 'Payment not done - awaiting admin approval'}
            </small>
            {player.adminProfile && <button className="player-edit-details-button" onClick={() => setEditing(true)}>
              Edit details <Pencil size={15} />
            </button>}
          </div>
        </article>

        {player.adminProfile && editing && (
          <form className="player-profile-form" onSubmit={onSave}>
            <label className="full-field">Player photo
              <input type="file" accept="image/*" onChange={event => onPhotoChange(event.target.files?.[0])} />
              <small className="field-hint">Choose the original, highest-resolution photo you have for the clearest player card.</small>
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
        )}
      </section>
    </div>
  );
}
