// lib/errors.js - friendly wording for auth failures (never show the raw server error).
export function friendlyAuthError(err) {
  if (err?.status === 401) return "That phone/email and password don't match. Check them and try again.";
  if (err?.status === 409) return "An account with these details already exists. Try logging in instead.";
  if (err?.status === 400) return "Please check your details. The password needs at least 8 characters.";
  return "Can't reach the server. Check that the backend is running, then try again.";
}
