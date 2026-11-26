export const PLAYER_REGISTRATION_CUTOFF = Date.parse('2026-11-27T00:00:00+05:30');

export function isPlayerRegistrationOpen(savedSetting, now = Date.now()) {
  if (savedSetting === true) return true;
  if (savedSetting === false) return false;
  return now < PLAYER_REGISTRATION_CUTOFF;
}

export function isAdminAuthorized(configuredPassword, providedPassword) {
  return Boolean(configuredPassword && providedPassword === configuredPassword);
}
