// components/StatusStamp.jsx
// Every status pairs a pixel icon + a text label (PRD NFR-13 — never color alone).

import PixelIcon from "./PixelIcon";

const STATUS = {
  completed: { className: "pixel-badge-completed", icon: "check",    label: "Completed" },
  due:       { className: "pixel-badge-due",       icon: "clock",    label: "Due" },
  overdue:   { className: "pixel-badge-overdue",   icon: "overdue",  label: "Overdue" },
  upcoming:  { className: "pixel-badge-upcoming",  icon: "upcoming", label: "Upcoming" },
  risk:      { className: "pixel-badge-risk",      icon: "risk",     label: "Risk flagged" },
};

export default function StatusStamp({ status, children }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <span className={s.className}>
      <PixelIcon name={s.icon} size={14} />
      {children ?? s.label}
    </span>
  );
}