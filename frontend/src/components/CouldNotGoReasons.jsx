/**
 * FR-D3/FR-D4/NFR-12: icon fallback, no reading required on any critical path.
 * Emoji + label together (screen readers and quick recognition both work).
 * Props: onSelect(reasonId), selected (reasonId | undefined).
 */
const REASONS = [
  { id: "no_transport", label: "No transport", hi: "आने-जाने का साधन नहीं था", icon: "🚌" },
  { id: "no_money", label: "No money", hi: "पैसे नहीं थे", icon: "💰" },
  { id: "no_childcare", label: "No childcare", hi: "बच्चे की देखभाल के लिए कोई नहीं था", icon: "👶" },
  { id: "family_did_not_permit", label: "Family did not permit", hi: "परिवार ने जाने की अनुमति नहीं दी", icon: "🏠" },
  { id: "facility_closed", label: "Facility closed", hi: "स्वास्थ्य केंद्र बंद था", icon: "🚪" },
  { id: "did_not_know", label: "Did not know", hi: "जानकारी नहीं थी", icon: "❓" },
];

export default function CouldNotGoReasons({ onSelect, selected, hindi = false }) {
  return (
    <div className="reason-grid" role="group" aria-label={hindi ? "मुलाकात न हो पाने का कारण" : "Why could you not go"}>
      {REASONS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r.id)}
          aria-pressed={selected === r.id}
          className={selected === r.id ? "reason-tile active" : "reason-tile"}
        >
          <span className="emoji" aria-hidden="true">{r.icon}</span>
          <span>{hindi ? r.hi : r.label}</span>
        </button>
      ))}
    </div>
  );
}
