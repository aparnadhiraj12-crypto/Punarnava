// lib/dates.js - display helpers. Backend dates are YYYY-MM-DD (no zone); timestamps are UTC.
export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayLong() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

// Journal timestamps are UTC; add Z if the string carries no zone.
export function formatTimestamp(ts) {
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(ts);
  const d = new Date(hasZone ? ts : `${ts}Z`);
  return isNaN(d) ? ts : d.toLocaleString("en-IN");
}

// Whole days between two YYYY-MM-DD dates, or null if either is missing/invalid.
export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const a = new Date(`${fromIso}T00:00:00`), b = new Date(`${toIso}T00:00:00`);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}
