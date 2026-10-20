// lib/session.js - the four localStorage keys from the guide (section 7).
// Every access is wrapped: storage can be blocked or empty and the demo must still work.
const K = {
  token: "punarnava_token",
  role: "punarnava_role",
  id: "punarnava_linked_id",
  name: "punarnava_name",
};

export function saveSession({ token, role, linked_id }, name) {
  try {
    localStorage.setItem(K.token, token ?? "");
    localStorage.setItem(K.role, role ?? "");
    localStorage.setItem(K.id, linked_id ?? "");
    localStorage.setItem(K.name, name ?? "");
    if (role === "mother" || role === "asha") localStorage.setItem(H.role, role);
  } catch { /* ignore */ }
}

export function getSession() {
  try {
    return {
      token: localStorage.getItem(K.token),
      role: localStorage.getItem(K.role),
      linkedId: localStorage.getItem(K.id),
      name: localStorage.getItem(K.name),
    };
  } catch {
    return { token: null, role: null, linkedId: null, name: null };
  }
}

export function clearSession() {
  try { Object.values(K).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}

// Same fallback rule as Timeline.jsx (guide section 5).
export function currentWomanId() {
  return getSession().linkedId || "demo-lakshmi";
}

// After signup / login: mother -> own timeline, asha -> /a, clinic -> /a (no clinic home yet).
export function homeFor(role, linkedId) {
  if (role === "mother") {
    return linkedId ? `/m/${linkedId}` : "/m";
  }

  if (role === "asha") {
    return "/a";
  }

  if (role === "doctor") {
    return "/d";
  }

  if (role === "family") {
    return "/f";
  }

  return "/login";
}

// What the app remembers AFTER logout, so a returning user is never asked
// "mother or ASHA?" again. clearSession() deliberately leaves these alone.
const H = { role: "punarnava_role_hint", contact: "punarnava_contact_hint" };

export function rememberContact(contact) {
  try { if (contact) localStorage.setItem(H.contact, contact); } catch { /* ignore */ }
}

export function getHint() {
  try {
    return { role: localStorage.getItem(H.role), contact: localStorage.getItem(H.contact) };
  } catch {
    return { role: null, contact: null };
  }
}

export function forgetHint() {
  try { Object.values(H).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}
