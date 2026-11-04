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
        <div className="stadium-beam stadium-beam-left" />
        <div className="stadium-beam stadium-beam-right" />
        <div className="cartoon-cricket-match">
          <svg viewBox="0 0 320 220" role="img" aria-label="Animated cartoon bowler delivers to a batsman">
            <ellipse cx="160" cy="195" rx="148" ry="16" fill="rgba(48,205,165,.16)" />
            <path d="M20 184H300" stroke="rgba(149,235,224,.4)" strokeWidth="2" strokeDasharray="7 8" />
            <path d="M126 177 224 177 238 190 112 190Z" fill="rgba(226,199,127,.35)" stroke="rgba(255,226,154,.7)" />
            <g className="cartoon-bowler">
              <path d="m47 153-11 32M64 153l11 31" stroke="#78e8f2" strokeWidth="9" strokeLinecap="round" />
              <path d="M37 185h-9M76 184h10" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
              <path d="M42 113q18-10 36 1l7 42q-21 12-48 0Z" fill="#27b9cb" stroke="#9ff8ff" strokeWidth="2" />
              <circle cx="60" cy="91" r="17" fill="#d99a71" />
              <path d="M43 91q2-23 20-21 14 2 15 18l-8-6-10 4-12-3Z" fill="#162b4c" stroke="#ffdf42" strokeWidth="3" />
              <circle cx="66" cy="91" r="2" fill="#172032" />
              <path d="M71 98q-5 5-10 1" fill="none" stroke="#753e38" strokeWidth="2" strokeLinecap="round" />
              <path d="M47 119 31 135" stroke="#d99a71" strokeWidth="8" strokeLinecap="round" />
              <g className="cartoon-bowling-arm"><path d="M76 120 96 105 91 83" fill="none" stroke="#d99a71" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /><circle cx="91" cy="81" r="5" fill="#d99a71" /></g>
              <path d="m48 157-9 12M69 158l10 12" stroke="#ffdf42" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g className="cartoon-batsman">
              <path d="m242 151-7 34M261 151l11 33" stroke="#ff4c91" strokeWidth="10" strokeLinecap="round" />
              <path d="M234 185h-10M273 184h9" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
              <path d="M231 112q20-12 38 2l-3 43q-25 10-46-1Z" fill="#ec3e88" stroke="#ff9ac2" strokeWidth="2" />
              <circle cx="246" cy="91" r="17" fill="#bd805f" />
              <path d="M229 91q1-21 18-22 20 1 18 23l-10-7-11 2-9-4Z" fill="#f8cb39" stroke="#fff1a1" strokeWidth="3" />
              <path d="M232 94h28M250 96v8" fill="none" stroke="#1f354d" strokeWidth="2" />
              <path d="m232 119-15 10" stroke="#bd805f" strokeWidth="8" strokeLinecap="round" />
              <g className="cartoon-bat-swing"><path d="m229 120 22-17" stroke="#bd805f" strokeWidth="8" strokeLinecap="round" /><path d="m248 108 25-34q5-7 12-2l5 4q4 4 0 9l-29 31Z" fill="#e8c375" stroke="#fff0bd" strokeWidth="3" /><path d="m266 87 13 10M262 93l13 10M258 99l13 9" stroke="#947140" strokeWidth="2" /></g>
            </g>
            <path d="M292 144v39M300 144v39M308 144v39M289 145h22M289 151h22" stroke="#fff0bd" strokeWidth="3" strokeLinecap="round" />
            <g className="cartoon-delivery-ball"><circle r="7" fill="#ec3546" stroke="#ffd5c8" strokeWidth="2" /><path d="M-2-4q5 4 0 8" fill="none" stroke="#fff" strokeWidth="1.5" /></g>
            <path className="cartoon-ball-trail" d="M93 81q49 16 91 47" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeDasharray="5 7" />
            <text x="160" y="213" textAnchor="middle" fill="#d7ff59" fontSize="9" fontWeight="900" letterSpacing="2">BOWL • BAT • PLAY</text>
          </svg>
        </div>
        <div className="profile-confetti">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
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
