import { useEffect, useState } from "react";
import { getWoman, recordVisit } from "../../lib/api";
import VoiceButton from "../../components/VoiceButton";
import CouldNotGoReasons from "../../components/CouldNotGoReasons";

/**
 * PRD, C4: "The screen that carries the pitch is the mother's timeline...
 * with no visual break at delivery and none at six weeks. That continuity
 * is the entire thesis rendered as a UI."
 *
 * Wired to the real record service: fetches the seeded demo mother
 * (Lakshmi — GDM on metformin, discharge Hb 8.2, see backend/main.py
 * seed_demo_data) by her fixed demo ID. Milestones come back
 * live-computed by the scheduler, not hardcoded here. Real version reads
 * woman_id from the route/auth context instead of a fixed demo ID.
 */
const DEMO_WOMAN_ID = "demo-lakshmi";

const STATE_STYLE = {
  due: "border-due text-due",
  missed: "border-overdue text-overdue",
  done: "border-done text-done",
  pending: "border-clay-500 text-clay-700",
};

const LABELS = {
  postnatal_visit: "Postnatal visit",
  six_week_review: "Six-week review",
  postpartum_glucose_test: "Glucose test",
  blood_pressure_review: "Blood pressure review",
  haemoglobin_recheck: "Haemoglobin recheck",
  cervical_screening_enrolment: "Cervical screening",
  contraception_counselling: "Contraception counselling",
  annual_wellness_check: "Annual wellness check",
};

export default function MotherTimeline() {
  const [woman, setWoman] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [active, setActive] = useState(null);
  const [reason, setReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getWoman(DEMO_WOMAN_ID)
      .then((w) => {
        setWoman(w);
        setMilestones(w.milestones || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const markDone = (m) => {
    recordVisit(DEMO_WOMAN_ID, "done", null, m.rule_id);
    setMilestones((prev) =>
      prev.map((x) => (x.rule_id === m.rule_id ? { ...x, state: "done", days_overdue: -1 } : x))
    );
    setActive(null);
  };

  const submitCouldNotGo = (m) => {
    recordVisit(DEMO_WOMAN_ID, "could_not_go", reason, m.rule_id);
    setActive(null);
    setReason(null);
  };

  return (
    <div className="min-h-screen bg-clay-50 pb-24" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-semibold text-plum-700">Your record</h1>
        <p className="text-sm text-clay-700">Pregnancy → now → what's ahead. Nothing resets.</p>
      </header>

      {loading && <p className="px-5 text-clay-700">Loading…</p>}
      {error && (
        <p className="px-5 text-overdue text-sm">
          Couldn't reach the backend. Run <code>uvicorn main:app --reload</code> in{" "}
          <code>backend/</code> first.
        </p>
      )}

      {/* The continuous spine: a single vertical line, delivery marked as one
          point on it (not a break), postpartum items and long-horizon
          milestones on the same axis. */}
      <div className="relative px-5">
        <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-clay-100" aria-hidden="true" />

        {/* Delivery marker — a point on the line, not a wall */}
        <div className="relative flex items-center gap-4 py-3">
          <div className="z-10 w-4 h-4 rounded-full bg-plum-500 border-4 border-clay-50 ml-6" />
          <div>
            <p className="text-sm font-medium text-plum-700">Delivery</p>
            <p className="text-xs text-clay-700">{woman?.delivery_date}</p>
          </div>
        </div>

        {milestones.map((m) => {
          const isOverdue = m.days_overdue > 0 && m.state !== "done";
          const state = m.state === "done" ? "done" : isOverdue ? "missed" : "due";
          return (
            <div key={m.rule_id} className="relative flex items-start gap-4 py-3">
              <div
                className={`z-10 w-4 h-4 rounded-full border-4 border-clay-50 ml-6 ${
                  state === "done" ? "bg-done" : state === "missed" ? "bg-overdue" : "bg-due"
                }`}
              />
              <button
                onClick={() => setActive(active?.rule_id === m.rule_id ? null : m)}
                className={`flex-1 text-left bg-white rounded-xl p-4 border-l-4 shadow-sm ${STATE_STYLE[state]}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-plum-700">{LABELS[m.type] || m.type}</p>
                    <p className="text-xs text-clay-700">Due {m.due_date}</p>
                    {isOverdue && (
                      <p className="text-xs text-overdue font-medium">{m.days_overdue} days overdue</p>
                    )}
                  </div>
                  <VoiceButton
                    label={`Hear about ${LABELS[m.type] || m.type}`}
                    onSpeak={(e) => {
                      e.stopPropagation();
                      // TRD C3: template + slots, never free generation.
                      // Stub: real version calls outreach voice delivery.
                    }}
                  />
                </div>
                <p className="text-[11px] text-clay-500 mt-2">Source: {m.citation}</p>
              </button>
            </div>
          );
        })}
      </div>

      {/* Action sheet for the selected milestone */}
      {active && (
        <div
          className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-lg p-5 border-t border-clay-100"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)" }}
        >
          <p className="font-medium text-plum-700 mb-3">{LABELS[active.type] || active.type}</p>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => markDone(active)}
              className="flex-1 py-3 rounded-xl bg-done text-white font-medium"
            >
              Done
            </button>
            <button
              onClick={() => setReason("picking")}
              className="flex-1 py-3 rounded-xl bg-clay-100 text-clay-700 font-medium"
            >
              Could not go
            </button>
          </div>
          {reason && (
            <div className="mb-3">
              <CouldNotGoReasons
                selected={reason === "picking" ? null : reason}
                onSelect={(r) => {
                  setReason(r);
                  submitCouldNotGo(active);
                }}
              />
            </div>
          )}
          <button onClick={() => setActive(null)} className="w-full text-sm text-clay-500 py-2">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
