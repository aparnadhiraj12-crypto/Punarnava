// /m/enrol - manual enrolment (J1). Field names match POST /api/ingestion/manual
// exactly (guide 2.1). Restyled as a two-step form-card, matching the redesign.
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Field, { SelectField } from "../../components/Field";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import PixelArt from "../../components/PixelArt";
import { enrolMother } from "../../lib/api";

export default function Enrol() {
  const location = useLocation();
  const role = location.pathname.startsWith("/a/") ? "asha" : "mother";
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    woman_name: "", delivery_date: "", mode_of_delivery: "normal", discharge_hb: "",
    gestational_diabetes: false, on_metformin: false,
    hypertensive_in_pregnancy: false, significant_blood_loss: false, language: "te",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const set = (k) => (e) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = { ...f, woman_name: f.woman_name.trim() };
    payload.discharge_hb = f.discharge_hb === "" ? null : Number(f.discharge_hb);
    try {
      const res = await enrolMother(payload);
      setCreated(res.woman);
    } catch {
      setError("Could not enrol. Check the details and that the backend is running.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <AppShell role={role}>
        <div className="success-state">
          <PixelArt kind="success" />
          <div className="display display-lg">{created.name} is enrolled.</div>
          <p>Her care journey has started.</p>
          <div className="button-row">
            <Link to={`/m/${created.id}`}><Button>View journey</Button></Link>
            <Link to="/a"><Button tone="secondary">See ASHA queue</Button></Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role}>
      <PageTitle eyebrow={`Step ${step} of 2`} title="Enrol a mother" copy="Add only the information needed to begin a continuity record." />
      <div className="stepper">
        <span className="active" />
        <span className={step === 2 ? "active" : ""} />
      </div>

      <form className="form-card" onSubmit={submit}>
        {step === 1 ? (
          <>
            <Field label="Mother's name" placeholder="Full name" value={f.woman_name} onChange={set("woman_name")} required />
            <Field label="Delivery date" type="date" value={f.delivery_date} onChange={set("delivery_date")} required />
            <SelectField label="Mode of delivery" value={f.mode_of_delivery} onChange={set("mode_of_delivery")}
                         options={[["normal", "Normal"], ["LSCS", "C-section (LSCS)"], ["assisted", "Assisted"]]} />
            <SelectField label="Language" value={f.language} onChange={set("language")}
                         options={[["te", "Telugu"], ["ml", "Malayalam"], ["pa", "Punjabi"], ["en", "English"]]} />
            <Button type="button" onClick={() => setStep(2)}>Continue <Icon name="arrow" /></Button>
          </>
        ) : (
          <>
            <Field label="Haemoglobin at discharge (optional)" type="number" step="0.1" min="0"
                   value={f.discharge_hb} onChange={set("discharge_hb")} />
            <fieldset className="field-group">
              <legend>During pregnancy or delivery</legend>
              <label className="check-row"><input type="checkbox" checked={f.gestational_diabetes} onChange={set("gestational_diabetes")} /><span>Gestational diabetes</span></label>
              <label className="check-row"><input type="checkbox" checked={f.on_metformin} onChange={set("on_metformin")} /><span>On metformin</span></label>
              <label className="check-row"><input type="checkbox" checked={f.hypertensive_in_pregnancy} onChange={set("hypertensive_in_pregnancy")} /><span>High blood pressure</span></label>
              <label className="check-row"><input type="checkbox" checked={f.significant_blood_loss} onChange={set("significant_blood_loss")} /><span>Significant blood loss</span></label>
            </fieldset>
            {error && <p role="alert" className="form-error">{error}</p>}
            <div className="button-row">
              <Button type="button" tone="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" disabled={busy}>{busy ? "Enrolling…" : "Save mother"} <Icon name="check" /></Button>
            </div>
          </>
        )}
      </form>
    </AppShell>
  );
}
