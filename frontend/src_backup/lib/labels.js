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

// state is exactly: due | done | pending | missed | not_applicable
const STATES = {
  due:            { label: "Due",            card: "pixel-card-due",       stamp: "due" },
  done:           { label: "Completed",      card: "pixel-card-completed", stamp: "completed" },
  pending:        { label: "Upcoming",       card: "pixel-card",           stamp: "upcoming" },
  missed:         { label: "Overdue",        card: "pixel-card-overdue",   stamp: "overdue" },
  not_applicable: { label: "Not applicable", card: "pixel-card",           stamp: null },
};

export const stateLabel = (s) => STATES[s]?.label ?? humanize(s);
export const stateCardClass = (s) => STATES[s]?.card ?? "pixel-card";
export const stateStampStatus = (s) => STATES[s]?.stamp ?? null;
