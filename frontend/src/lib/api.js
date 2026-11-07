// lib/api.js - every backend call in one place. Field names follow the
// FRONTEND guide section 2 exactly; do not rename them.
export const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

export function isNetworkError(error) {
  return error instanceof TypeError || error?.status === undefined;
}

export async function sendQueuedRequest(item) {
  return send(item.method, item.path, item.body);
}

async function send(method, path, body, tokenOverride) {
  let token = tokenOverride;
  if (token === undefined) {
    try { token = localStorage.getItem("punarnava_token"); } catch { /* ignore */ }
  }
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data.detail === "string" ? data.detail : res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---- records and scheduling ----
// listWomen is already sorted worst-first by the backend. Never re-sort it.
export const listWomen = () => send("GET", "/record/women");
export const getWoman = (id) => send("GET", `/record/women/${encodeURIComponent(id)}`);
export const getMilestonePreparation = (womanId, ruleId) =>
  send("GET", `/preparation/women/${encodeURIComponent(womanId)}/milestones/${encodeURIComponent(ruleId)}`);
export const saveMilestonePreparation = (womanId, ruleId, payload) =>
  send("PUT", `/preparation/women/${encodeURIComponent(womanId)}/milestones/${encodeURIComponent(ruleId)}`, payload);
export const lookupWomanByCode = (code) =>
  send("GET", `/record/lookup/${encodeURIComponent(code)}`);
export const getInteractions = (id) => send("GET", `/record/women/${encodeURIComponent(id)}/interactions`);
export const getReasonCounts = () => send("GET", "/record/interactions/reasons");

// Enrol a mother. Payload keys: woman_name, delivery_date, mode_of_delivery,
// discharge_hb, gestational_diabetes, on_metformin, hypertensive_in_pregnancy,
// significant_blood_loss, language. Returns { status, woman }.
export const enrolMother = (payload) => send("POST", "/ingestion/manual", payload);

// outcome: done | not_done | could_not_go. reason only for could_not_go.
// ruleId optional: omitted -> backend updates the most overdue milestone (ASHA two-tap).
export function recordVisit(womanId, outcome, reason, ruleId) {
  const body = { woman_id: womanId, outcome };
  if (reason) body.reason = reason;
  if (ruleId) body.rule_id = ruleId;
  return send("POST", "/outreach/respond", body);
}

// ---- auth, wellness, journal, safety ----
export const signup = (payload) => send("POST", "/auth/signup", payload);
export const login = (payload) => send("POST", "/auth/login", payload);
export const getMe = (token) => send("GET", "/auth/me", undefined, token);
export async function logout() {
  try {
    return await send("POST", "/auth/logout");
  } finally {
    try { localStorage.removeItem("punarnava_token"); } catch { /* ignore */ }
  }
}

export function getWellnessContent({ stage, region } = {}) {
  const q = new URLSearchParams();
  if (stage) q.set("stage", stage);
  if (region) q.set("region", region);
  return send("GET", `/wellness/content?${q}`);
}

export function getDietProfile(womanId) {
  return send("GET", `/wellness/diet-profile/${encodeURIComponent(womanId)}`);
}

export function saveDietProfile(womanId, payload) {
  return send("PUT", `/wellness/diet-profile/${encodeURIComponent(womanId)}`, payload);
}

export function getPersonalizedDietContent({ womanId, stage, region } = {}) {
  const q = new URLSearchParams();
  if (stage) q.set("stage", stage);
  if (region) q.set("region", region);
  const query = q.toString();
  return send(
    "GET",
    `/wellness/diet-content/${encodeURIComponent(womanId)}${query ? `?${query}` : ""}`,
  );
}

export function getProviders({ type, region, language } = {}) {
  const q = new URLSearchParams();
  if (type) q.set("type", type);
  if (region) q.set("region", region);
  if (language) q.set("language", language);
  return send("GET", `/wellness/providers?${q}`);
}

export const addJournalEntry = (womanId, moodEmoji, note) =>
  send("POST", "/journal/entry", { woman_id: womanId, mood_emoji: moodEmoji, note: note || null });
export const getJournal = (womanId) => send("GET", `/journal/${encodeURIComponent(womanId)}`);

// No arguments about symptoms or the woman, on purpose.
export const getDangerSigns = (language = "en") => send("GET", `/safety/danger-signs?language=${language}`);

export const grantFamilyAccess = (payload) =>
  send("POST", "/family/grant", payload);

export const revokeFamilyAccess = (grantId) =>
  send("POST", `/family/grant/${encodeURIComponent(grantId)}/revoke`);

export const getFamilySharedView = (womanId) =>
  send("GET", `/family/shared-view/${encodeURIComponent(womanId)}`);

export const getFamilyGrants = (womanId) =>
  send("GET", `/family/grants/${encodeURIComponent(womanId)}`);

export const getPartnerAlerts = (womanId) =>
  send("GET", `/family/partner-alerts/${encodeURIComponent(womanId)}`);

export const updatePartnerPhone = (womanId, spouse_phone) =>
  send("PUT", `/family/partner-phone/${encodeURIComponent(womanId)}`, { spouse_phone });

export function getMedications(womanId) {
  return send("GET", `/clinical/medication/${womanId}`);
}

// Blood-pressure readings a doctor typed in on the clinician website.
export function getBpReadings(womanId) {
  return send("GET", `/clinical/bp/${encodeURIComponent(womanId)}`);
}

export function getMotherReport(womanId) {
  return send("GET", `/report/${womanId}`);
}

// ----- new API helpers for daily check‑in, allergies, budget, feedback & suggestions -----
export const postDailyCheckIn = (womanId, payload) =>
  send("POST", `/wellness/daily-checkin/${encodeURIComponent(womanId)}`, payload);
export const getDailyCheckIns = (womanId) =>
  send("GET", `/wellness/daily-checkin/${encodeURIComponent(womanId)}`);

export const putAllergyProfile = (womanId, payload) =>
  send("PUT", `/wellness/allergy-profile/${encodeURIComponent(womanId)}`, payload);
export const getAllergyProfile = (womanId) =>
  send("GET", `/wellness/allergy-profile/${encodeURIComponent(womanId)}`);

export const putBudgetProfile = (womanId, payload) =>
  send("PUT", `/wellness/budget-profile/${encodeURIComponent(womanId)}`, payload);
export const getBudgetProfile = (womanId) =>
  send("GET", `/wellness/budget-profile/${encodeURIComponent(womanId)}`);

export const postFoodFeedback = (womanId, payload) =>
  send("POST", `/wellness/food-feedback/${encodeURIComponent(womanId)}`, payload);
export const getFoodFeedback = (womanId) =>
  send("GET", `/wellness/food-feedback/${encodeURIComponent(womanId)}`);
export const deleteFoodFeedback = (womanId, foodId) =>
  send("DELETE", `/wellness/food-feedback/${encodeURIComponent(womanId)}/${encodeURIComponent(foodId)}`);

export const getFoodSuggestions = (womanId, { stage, region } = {}) => {
  const q = new URLSearchParams();
  if (stage) q.set("stage", stage);
  if (region) q.set("region", region);
  const query = q.toString();
  return send(
    "GET",
    `/wellness/food-suggestions/${encodeURIComponent(womanId)}${query ? `?${query}` : ""}`
  );
};

export const getSchemeProgress = (womanId) =>
  send("GET", `/schemes/${encodeURIComponent(womanId)}`);

export const saveSchemeProgress = (womanId, scheme, status) =>
  send("PUT", `/schemes/${encodeURIComponent(womanId)}/${encodeURIComponent(scheme)}`, { status });
