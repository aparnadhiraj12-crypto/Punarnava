import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getWoman } from "../../lib/api";

/**
 * FR-F1/F2 — "a one-page structured summary: pregnancy course, delivery,
 * complications, discharge values, completed and outstanding items.
 * Exportable as image and PDF, shareable without the recipient having an
 * account." PRD user: Dr. Rao — "a structured one-page view of what
 * happened during her pregnancy and delivery, before she sits down."
 *
 * v0 honesty: "export as PDF/image" here means the browser's own
 * print-to-PDF (window.print), not a generated file — FR-F2's own export
 * pipeline isn't built. Printable + shareable-by-link is the real claim
 * for tonight; say so if asked.
 *
 * Route: /s/:token (shareable, no account) and /c/handoff/:id both land
 * here — :token/:id is the woman's id in this v0 (a real build would use
 * a separate opaque, revocable share token, not the record id itself).
 */
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

const EVENT_LABELS = {
  gestational_diabetes: "Gestational diabetes",
  hypertensive_in_pregnancy: "Hypertensive in pregnancy",
  significant_blood_loss: "Significant blood loss",
};

export default function Handoff() {
  const { id, token } = useParams();
  const womanId = id || token;
  const [woman, setWoman] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getWoman(womanId)
      .then(setWoman)
      .catch(() => setError(true));
  }, [womanId]);

  if (error) {
    return (
      <div className="min-h-screen bg-clay-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-overdue">Couldn't load this record.</p>
        <Link to="/" className="text-sm text-plum-500 underline mt-3">Back</Link>
      </div>
    );
  }
  if (!woman) return <p className="p-6 text-clay-700">Loading…</p>;

  const done = woman.milestones.filter((m) => m.state === "done");
  const outstanding = woman.milestones.filter((m) => m.state !== "done");

  return (
    <div className="min-h-screen bg-clay-50 py-8 print:bg-white print:py-0">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm print:shadow-none p-8">
        <div className="flex justify-between items-start mb-6 print:hidden">
          <span className="text-xs text-clay-500">No account needed to view this page</span>
          <button
            onClick={() => window.print()}
            className="text-xs px-3 py-1.5 rounded-lg bg-plum-500 text-white"
          >
            Print / Save as PDF
          </button>
        </div>

        <header className="border-b border-clay-100 pb-4 mb-4">
          <p className="text-xs text-clay-500 uppercase tracking-wide">PUNARNAVA · Handoff summary</p>
          <h1 className="text-xl font-semibold text-plum-700 mt-1">{woman.name}</h1>
          <p className="text-sm text-clay-700">
            Postpartum day {woman.postpartum_day} · delivered {woman.delivery_date}
            {woman.incomplete && <span className="text-overdue"> · record incomplete</span>}
          </p>
        </header>

        <Section title="Pregnancy & delivery">
          <Row label="Discharge haemoglobin" value={woman.discharge_hb ? `${woman.discharge_hb} g/dL` : "Not recorded"} />
          <Row
            label="Complications / conditions"
            value={
              woman.clinical_events.length
                ? woman.clinical_events.map((e) => EVENT_LABELS[e.type] || e.type).join(", ")
                : "None recorded"
            }
          />
        </Section>

        <Section title={`Completed (${done.length})`}>
          {done.length === 0 && <p className="text-sm text-clay-500">Nothing completed yet.</p>}
          {done.map((m) => (
            <Row key={m.rule_id} label={LABELS[m.type] || m.type} value="Done" valueClass="text-done" />
          ))}
        </Section>

        <Section title={`Outstanding (${outstanding.length})`}>
          {outstanding.length === 0 && <p className="text-sm text-clay-500">Nothing outstanding.</p>}
          {outstanding.map((m) => (
            <div key={m.rule_id} className="py-2 border-b border-clay-50 last:border-0">
              <div className="flex justify-between text-sm">
                <span className="text-plum-700">{LABELS[m.type] || m.type}</span>
                <span className={m.days_overdue > 0 ? "text-overdue font-medium" : "text-due"}>
                  {m.days_overdue > 0 ? `${m.days_overdue}d overdue` : `due ${m.due_date}`}
                </span>
              </div>
              <p className="text-[11px] text-clay-500 mt-0.5">Source: {m.citation}</p>
            </div>
          ))}
        </Section>

        <footer className="mt-6 pt-4 border-t border-clay-100 text-[11px] text-clay-500">
          Generated from her own record. Every item above traces to a rule, ruleset version and
          published citation — see docs/compliance.md. This summary is operational, not a
          clinical assessment.
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold text-clay-500 uppercase tracking-wide mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, valueClass = "text-plum-700" }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-clay-50 last:border-0">
      <span className="text-clay-700">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
