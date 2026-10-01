/**
 * FR-D3/FR-D4/NFR-12: icon fallback, no reading required on any critical path.
 * Emoji + label together (screen readers and quick recognition both work).
 * Props: onSelect(reasonId), selected (reasonId | undefined).
 */
const REASONS = [
  { id: "no_transport", label: "No transport", icon: "🚌" },
  { id: "no_money", label: "No money", icon: "💰" },
  { id: "no_childcare", label: "No childcare", icon: "👶" },
  { id: "family_did_not_permit", label: "Family did not permit", icon: "🏠" },
  { id: "facility_closed", label: "Facility closed", icon: "🚪" },
  { id: "did_not_know", label: "Did not know", icon: "❓" },
];

export default function CouldNotGoReasons({ onSelect, selected }) {
  return (
    <div className="reason-grid" role="group" aria-label="Why could you not go">
      {REASONS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r.id)}
          aria-pressed={selected === r.id}
          className={selected === r.id ? "reason-tile active" : "reason-tile"}
        >
          <span className="emoji" aria-hidden="true">{r.icon}</span>
          <span>{r.label}</span>
        </button>
      ))}
    </div>
  );
}
