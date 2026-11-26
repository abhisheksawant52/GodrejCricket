export const PLAYER_REGISTRATION_CUTOFF = Date.parse('2026-11-26T10:04:10Z');

export function isPlayerRegistrationOpen(savedSetting, now = Date.now()) {
  if (now >= PLAYER_REGISTRATION_CUTOFF) return false;
  if (savedSetting === true) return true;
  if (savedSetting === false) return false;
  return now < PLAYER_REGISTRATION_CUTOFF;
}

export function isAdminAuthorized(configuredPassword, providedPassword) {
  return Boolean(configuredPassword && providedPassword === configuredPassword);
}
