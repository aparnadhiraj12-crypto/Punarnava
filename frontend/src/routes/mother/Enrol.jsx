// routes/mother/Enrol.jsx
import { useState } from "react";
import { enrolMother } from "../../lib/api";
import PixelIcon from "../../components/PixelIcon";

const LABELS = {
  woman_name: "Mother's name",
  delivery_date: "Delivery date",
  mode_of_delivery: "Mode of delivery",
  gestational_diabetes: "Gestational diabetes",
  hypertensive_in_pregnancy: "Hypertension in pregnancy",
  significant_blood_loss: "Significant blood loss",
};

export default function Enrol() {
  const [form, setForm] = useState({
    woman_name: "",
    delivery_date: "",
    mode_of_delivery: "vaginal",
    gestational_diabetes: false,
    hypertensive_in_pregnancy: false,
    significant_blood_loss: false,
  });
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("saving");
    try {
      await enrolMother(form);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="bg-paper min-h-screen">
      <div className="relative h-40 pixel-dither bg-sage/50" />
      <div className="max-w-lg mx-auto px-6 -mt-10">
        <div className="pixel-card bg-cream">
          <h1 className="text-2xl mb-1">Welcome a mother to Punarnava</h1>
          <p className="text-sm text-earth mb-6">
            Add her delivery details so her postpartum care journey can begin.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium">{LABELS.woman_name}</span>
              <input
                required
                value={form.woman_name}
                onChange={(e) => setForm({ ...form, woman_name: e.target.value })}
                className="pixel-frame mt-1 w-full border-2 border-ink/60 px-3 py-2 bg-cream"
                style={{ "--notch": "4px" }}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">{LABELS.delivery_date}</span>
              <input
                required
                type="date"
                value={form.delivery_date}
                onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                className="pixel-frame mt-1 w-full border-2 border-ink/60 px-3 py-2 bg-cream"
                style={{ "--notch": "4px" }}
              />
            </label>

            <fieldset>
              <legend className="text-sm font-medium mb-2">{LABELS.mode_of_delivery}</legend>
              <div className="flex gap-4 text-sm">
                {[["vaginal", "Vaginal"], ["c_section", "C-section"], ["other", "Other"]].map(
                  ([val, text]) => (
                    <label key={val} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="mode"
                        checked={form.mode_of_delivery === val}
                        onChange={() => setForm({ ...form, mode_of_delivery: val })}
                      />
                      {text}
                    </label>
                  )
                )}
              </div>
            </fieldset>

            <div className="pixel-card-overdue">
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <PixelIcon name="risk" size={14} className="text-clay" />
                Risk flags
              </p>
              {["gestational_diabetes", "hypertensive_in_pregnancy", "significant_blood_loss"].map(
                (key) => (
                  <label key={key} className="flex items-center gap-2 text-sm mb-1.5 last:mb-0">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    />
                    {LABELS[key]}
                  </label>
                )
              )}
            </div>

            <button type="submit" className="pixel-btn-primary w-full" disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Add mother"}
            </button>

            {status === "done" && (
              <p className="pixel-badge-completed w-fit">
                <PixelIcon name="check" size={14} /> Added to timeline
              </p>
            )}
            {status === "error" && (
              <p className="pixel-badge-overdue w-fit">
                <PixelIcon name="overdue" size={14} /> Couldn't reach the backend
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}