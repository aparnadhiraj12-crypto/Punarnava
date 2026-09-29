// /m/enrol - manual enrolment (J1). Field names match POST /api/ingestion/manual.
import { useState } from "react";
import { Link } from "react-router-dom";
import Page from "../../components/Page";
import { enrolMother } from "../../lib/api";

const input = "mt-1 w-full border-2 border-ink/60 bg-paper px-3 py-2";

export default function Enrol() {
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
      <Page title="Mother enrolled" back="/">
        <div className="pixel-card-completed space-y-3">
          <p className="text-lg text-ink">{created.name} is enrolled.</p>
          <div className="flex gap-2 flex-wrap">
            <Link to={`/m/${created.id}`} className="pixel-btn-primary">View timeline</Link>
            <Link to="/a" className="pixel-btn-secondary">See ASHA queue</Link>
          </div>
        </div>
      </Page>
    );
  }

  const Check = ({ k, label }) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="w-5 h-5" checked={f[k]} onChange={set(k)} />
      <span>{label}</span>
    </label>
  );

  return (
    <Page title="Enrol a mother" back="/">
      <form onSubmit={submit} className="pixel-card space-y-4">
        <label className="block"><span className="text-sm text-earth">Name</span>
          <input className={input} value={f.woman_name} onChange={set("woman_name")} required /></label>
        <label className="block"><span className="text-sm text-earth">Delivery date</span>
          <input type="date" className={input} value={f.delivery_date} onChange={set("delivery_date")} required /></label>
        <label className="block"><span className="text-sm text-earth">Mode of delivery</span>
          <select className={input} value={f.mode_of_delivery} onChange={set("mode_of_delivery")}>
            <option value="normal">Normal</option>
            <option value="LSCS">C-section (LSCS)</option>
            <option value="assisted">Assisted</option>
          </select></label>
        <label className="block"><span className="text-sm text-earth">Haemoglobin at discharge (optional)</span>
          <input type="number" step="0.1" min="0" className={input} value={f.discharge_hb} onChange={set("discharge_hb")} /></label>
        <label className="block"><span className="text-sm text-earth">Language</span>
          <select className={input} value={f.language} onChange={set("language")}>
            <option value="te">Telugu</option><option value="ml">Malayalam</option>
            <option value="pa">Punjabi</option><option value="en">English</option>
          </select></label>

        <fieldset className="space-y-2">
          <legend className="text-sm text-earth mb-1">During pregnancy or delivery</legend>
          <Check k="gestational_diabetes" label="Gestational diabetes" />
          <Check k="on_metformin" label="On metformin" />
          <Check k="hypertensive_in_pregnancy" label="High blood pressure" />
          <Check k="significant_blood_loss" label="Significant blood loss" />
        </fieldset>

        {error && <p role="alert" className="text-clay font-medium">{error}</p>}
        <button className="pixel-btn-primary w-full" disabled={busy}>{busy ? "Enrolling..." : "Enrol mother"}</button>
      </form>
    </Page>
  );
}
