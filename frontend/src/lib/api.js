import { cache, getCached, queueWrite } from "../store/offlineStore";

const BASE = import.meta.env.VITE_API_BASE || "/api";

async function get(path, cacheKey) {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    if (cacheKey) cache(cacheKey, data);
    return data;
  } catch (err) {
    // NFR-7: timeline and queue must render from cache with no network.
    const cached = cacheKey ? getCached(cacheKey) : null;
    if (cached) return cached;
    throw err;
  }
}

export function getWomen() {
  return get("/record/women", "women");
}

export function getWoman(id) {
  return get(`/record/women/${id}`, `woman:${id}`);
}

export function getSchedule(deliveryDate, clinicalEvents) {
  return fetch(`${BASE}/scheduler/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ delivery_date: deliveryDate, clinical_events: clinicalEvents }),
  }).then((r) => r.json());
}

/** Two-tap visit recording (FR-E3) — queues locally if offline, syncs later.
 * ruleId is optional: omit it for the ASHA queue's quick tap (applies to
 * whichever milestone is most overdue for that woman); pass it from the
 * mother's timeline where a specific milestone was tapped. */
export function recordVisit(womanId, outcome, reason, ruleId) {
  const action = { type: "record_visit", woman_id: womanId, rule_id: ruleId, outcome, reason };
  queueWrite(action);
  return fetch(`${BASE}/outreach/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ woman_id: womanId, rule_id: ruleId ?? null, outcome, reason }),
  }).catch(() => {
    // queued already — offline is a success path, not an error (NFR-15/16)
    return { queued: true };
  });
}

/** New-mother enrolment — queues locally if offline, syncs later (NFR-15/16),
 * same pattern as recordVisit. Backend: POST /api/ingestion/manual. */
export function enrolMother(payload) {
  const action = { type: "enrol_mother", ...payload };
  queueWrite(action);
  return fetch(`${BASE}/ingestion/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    })
    .catch(() => {
      // queued already — offline is a success path, not an error
      return { queued: true };
    });
}