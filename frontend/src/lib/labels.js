// lib/labels.js - the only place display names live. Unknown types fall back to
// a readable version of the backend id, so a new rule never shows a raw snake_case key.
const humanize = (s) => (s ? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "");

const MILESTONES = {
  postnatal_visit: "Postnatal visit",
};
const EVENTS = {
  gestational_diabetes: "Gestational diabetes",
  hypertensive_in_pregnancy: "High blood pressure in pregnancy",
  significant_blood_loss: "Significant blood loss",
  on_metformin: "On metformin",
};

export const milestoneLabel = (type) => MILESTONES[type] ?? humanize(type);
export const eventLabel = (type) => EVENTS[type] ?? humanize(type);
export const humanizeId = humanize;

// state is exactly: due | done | pending | missed | not_applicable
// tone  -> <Badge tone>   (sage | terra | mustard | ink)
// css   -> class suffix used by the timeline / preview / summary dots
// Every state also carries a text label, so colour is never the only signal (NFR-13).
const STATES = {
  due:            { label: "Due",            tone: "mustard", css: "due" },
  done:           { label: "Completed",      tone: "sage",    css: "complete" },
  pending:        { label: "Upcoming",       tone: "mustard", css: "upcoming" },
  missed:         { label: "Overdue",        tone: "terra",   css: "overdue" },
  not_applicable: { label: "Not applicable", tone: "ink",     css: "na" },
};

export const stateLabel = (s) => STATES[s]?.label ?? humanize(s);
export const stateTone = (s) => STATES[s]?.tone ?? "sage";
export const stateClass = (s) => STATES[s]?.css ?? "upcoming";

// "Overdue by 4 days" for a missed milestone, otherwise the plain state label.
export function stateText(m) {
  if (m.state === "missed" && m.days_overdue) {
    return `Overdue by ${m.days_overdue} day${m.days_overdue === 1 ? "" : "s"}`;
  }
  return stateLabel(m.state);
}
