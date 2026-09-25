/**
 * FR-D3/FR-D4/NFR-12: icon fallback, no reading required on any critical
 * path. Labels are shown too (for the ASHA/clinic views and for screen
 * readers) but the icon alone must be enough for the mother's view.
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
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="Why could you not go">
      {REASONS.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
            selected === r.id ? "border-plum-500 bg-clay-100" : "border-clay-100 bg-white"
          }`}
        >
          <span className="text-2xl" aria-hidden="true">{r.icon}</span>
          <span className="text-xs text-clay-700 text-center leading-tight">{r.label}</span>
        </button>
      ))}
    </div>
  );
}
