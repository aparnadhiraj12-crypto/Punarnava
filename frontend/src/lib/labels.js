// Human labels for the ruleset's milestone `type` and clinical `event` codes.
// Single source of truth so Timeline/Queue/Handoff never drift from
// backend/rulesets/ruleset.yaml and record/router.py's ClinicalEvent.type.
export const MILESTONE_LABELS = {
  postnatal_visit: "Postnatal visit",
  six_week_review: "Six-week review",
  postpartum_glucose_test: "Postpartum glucose test",
  blood_pressure_review: "Blood pressure review",
  haemoglobin_recheck: "Haemoglobin recheck",
  cervical_screening_enrolment: "Cervical screening enrolment",
  contraception_counselling: "Contraception counselling",
  annual_wellness_check: "Annual wellness check",
};

export const EVENT_LABELS = {
  gestational_diabetes: "Gestational diabetes",
  hypertensive_in_pregnancy: "Hypertension in pregnancy",
  significant_blood_loss: "Significant blood loss",
};

export const milestoneLabel = (type) =>
  MILESTONE_LABELS[type] ?? type.replace(/_/g, " ");

export const eventLabel = (type) => EVENT_LABELS[type] ?? type.replace(/_/g, " ");

export const stateLabel = (state) =>
  ({ due: "Due", done: "Done", pending: "Upcoming", missed: "Overdue", not_applicable: "Not applicable" }[state] ?? state);

export const stateCardClass = (state) =>
  state === "missed" ? "pixel-card-overdue" : state === "due" ? "pixel-card-due" : state === "done" ? "pixel-card-completed" : "pixel-card";

export const stateStampStatus = (state) =>
  state === "missed" ? "overdue" : state === "due" ? "due" : state === "done" ? "completed" : "upcoming";

export const sortByOverdue = (a, b) => (b.days_overdue ?? -1) - (a.days_overdue ?? -1);
