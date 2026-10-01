// lib/milestones.js - small derivations over woman.milestones. No scoring, no ranking:
// the backend already orders milestones and women; these only pick one to feature.

export const isActionable = (m) => m.state === "due" || m.state === "missed";

// The milestone to feature on the journey hero: the first that needs action,
// otherwise the first upcoming one, otherwise null (everything is done).
export function nextMilestone(milestones = []) {
  return (
    milestones.find((m) => m.state === "missed") ||
    milestones.find((m) => m.state === "due") ||
    milestones.find((m) => m.state === "pending") ||
    null
  );
}

// { done, total } - "not applicable" items are left out of the count.
export function progress(milestones = []) {
  const counted = milestones.filter((m) => m.state !== "not_applicable");
  return { done: counted.filter((m) => m.state === "done").length, total: counted.length };
}
