export const PLAYER_REGISTRATION_CUTOFF = Date.parse('2026-11-26T10:04:10Z');
export const PUBLIC_REGISTRATIONS_CLOSED = true;
export const SPONSOR_REGISTRATION_OPEN = true;

export function isPublicRegistrationClosed(type) {
  if (type === 'Sponsor') return !SPONSOR_REGISTRATION_OPEN;
  return PUBLIC_REGISTRATIONS_CLOSED || ['Player', 'Owner', 'Audience'].includes(type);
}

export function isPlayerRegistrationOpen(savedSetting, now = Date.now()) {
  if (PUBLIC_REGISTRATIONS_CLOSED) return false;
  if (now >= PLAYER_REGISTRATION_CUTOFF) return false;
  if (savedSetting === true) return true;
  if (savedSetting === false) return false;
  return now < PLAYER_REGISTRATION_CUTOFF;
}

export function isAdminAuthorized(configuredPassword, providedPassword) {
  return Boolean(configuredPassword && providedPassword === configuredPassword);
}
