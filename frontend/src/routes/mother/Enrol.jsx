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
import VoiceInput from "../../components/VoiceInput";
import PixelArt from "../../components/PixelArt";
import { enrolMother, isNetworkError } from "../../lib/api";
import { queueRequest } from "../../lib/offlineStore";

export default function Enrol() {
  const location = useLocation();
  const role = location.pathname.startsWith("/a/") ? "asha" : "mother";
  const isAsha = role === "asha";

  const [step, setStep] = useState(1);
  const [ashaForm, setAshaForm] = useState({
    name: "",
    age: "",
    village: "",
    phone: "",
    language: "te",
    pregnancy_start_date: "",
    delivery_date: "",
    conditions: {
      gestational_diabetes: false,
      hypertensive_in_pregnancy: false,
      significant_blood_loss: false,
    },
    medications: "",
    food_preferences: "",
    consent: false,
  });
  const [f, setF] = useState({
    woman_name: "", pregnancy_status: "delivered", pregnancy_start_date: "", delivery_date: "", mode_of_delivery: "normal", discharge_hb: "",
    gestational_diabetes: false, on_metformin: false,
    hypertensive_in_pregnancy: false, significant_blood_loss: false, language: "te",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const set = (k) => (e) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const setAsha = (key) => (e) =>
    setAshaForm((p) => ({ ...p, [key]: e.target.value }));

  const setAshaCondition = (key) => (e) =>
    setAshaForm((p) => ({
      ...p,
      conditions: { ...p.conditions, [key]: e.target.checked },
    }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (isAsha) {
        const payload = {
          woman_name: ashaForm.name.trim(),
          age: Number(ashaForm.age),
          village: ashaForm.village.trim(),
          phone: ashaForm.phone.trim(),
          language: ashaForm.language,
          pregnancy_start_date: ashaForm.pregnancy_start_date,
          delivery_date: ashaForm.delivery_date,
          gestational_diabetes: ashaForm.conditions.gestational_diabetes,
          on_metformin: false,
          hypertensive_in_pregnancy: ashaForm.conditions.hypertensive_in_pregnancy,
          significant_blood_loss: ashaForm.conditions.significant_blood_loss,
          medications: ashaForm.medications
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          food_preferences: ashaForm.food_preferences
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          consent: ashaForm.consent,
          mode_of_delivery: "normal",
          discharge_hb: null,
        };

        try {
          const res = await enrolMother(payload);
          setCreated(res.woman);
        } catch (error) {
          if (!isNetworkError(error)) throw error;

          queueRequest({
            method: "POST",
            path: "/ingestion/manual",
            body: payload,
            type: "asha_enrolment",
          });

          setCreated({
            woman_name: payload.woman_name,
            pending_sync: true,
          });
        }
        return;
      }

      const payload = {
        woman_name: f.woman_name.trim(),
        pregnancy_start_date:
          f.pregnancy_status === "pregnant" ? f.pregnancy_start_date : null,
        delivery_date:
          f.pregnancy_status === "delivered" ? f.delivery_date : null,
        mode_of_delivery: f.mode_of_delivery,
        discharge_hb:
          f.discharge_hb === "" ? null : Number(f.discharge_hb),
        gestational_diabetes: f.gestational_diabetes,
        on_metformin: f.on_metformin,
        hypertensive_in_pregnancy: f.hypertensive_in_pregnancy,
        significant_blood_loss: f.significant_blood_loss,
        language: f.language,
      };

      const res = await enrolMother(payload);
      setCreated(res.woman);
    } catch {
      setError(
        "Could not enrol. Check the details and that the backend is running."
      );
    } finally {
      setBusy(false);
    }
  }


  if (isAsha && !created) {
    return (
      <AppShell role="asha">
        <PageTitle
          eyebrow={`ASHA enrolment · ${step} of 10`}
          title={
            step === 1
              ? "What is her name?"
              : step === 2
                ? "How old is she?"
                : step === 3
                  ? "Which village does she live in?"
                  : step === 4
                  ? "What is her phone number?"
                  : step === 5
                  ? "Which language does she prefer?"
                  : step === 6
                  ? "When did her pregnancy start?"
                  : step === 7
                  ? "Does she have any of these conditions?"
                  : step === 8
                  ? "Is she taking any medicines?"
                  : step === 9
                  ? "Does she have any food preferences?"
                  : "Can we create her care record?"
          }
          copy={
            step === 1
              ? "Start with the mother's name. You can move through the rest one question at a time."
              : step === 2
                ? "Enter her age in completed years."
                : step === 3
                  ? "Enter the village or locality where she lives."
                  : step === 4
                  ? "Add a phone number if she has one."
                  : step === 5
                  ? "Choose the language she is most comfortable using."
                  : step === 6
                  ? "Enter the pregnancy start date and estimated due date."
                  : step === 7
                  ? "Select anything that applies to her pregnancy or delivery history."
                  : step === 8
                  ? "List any current medicines. You can enter more than one."
                  : step === 9
                  ? "Add foods she prefers, avoids, or cannot eat."
                  : "Confirm that she understands and agrees to this record being created."
          }
        />

        <div className="stepper">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={i < step ? "active" : ""} />
          ))}
        </div>

        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();

            if (step === 1 && ashaForm.name.trim()) {
              setStep(2);
            } else if (step === 2 && ashaForm.age) {
              setStep(3);
            } else if (step === 3 && ashaForm.village.trim()) {
              setStep(4);
            } else if (step === 4 && ashaForm.phone.trim()) {
              setStep(5);
            } else if (step === 5 && ashaForm.language) {
              setStep(6);
            } else if (step === 6 && ashaForm.pregnancy_start_date) {
              setStep(7);
            } else if (step === 7) {
              setStep(8);
            } else if (step === 8) {
              setStep(9);
            } else if (step === 9) {
              setStep(10);
            }
          }}
        >
          {step === 1 ? (
            <div className="field-group">
              <div className="button-row" style={{ alignItems: "flex-end" }}>
                <Field
                  label="Mother's name"
                  placeholder="Full name"
                  value={ashaForm.name}
                  onChange={setAsha("name")}
                  autoFocus
                  required
                />

                <VoiceInput
                  label="Speak mother's name"
                  onResult={(value) =>
                    setAshaForm((p) => ({
                      ...p,
                      name: value,
                    }))
                  }
                />
              </div>
            </div>
          ) : step === 2 ? (
            <Field
              label="Age"
              type="number"
              min="12"
              max="60"
              placeholder="Age in years"
              value={ashaForm.age}
              onChange={setAsha("age")}
              autoFocus
              required
            />
          ) : step === 3 ? (
            <div className="field-group">
              <div className="button-row" style={{ alignItems: "flex-end" }}>
                <Field
                  label="Village"
                  placeholder="Village or locality"
                  value={ashaForm.village}
                  onChange={setAsha("village")}
                  autoFocus
                  required
                />

                <VoiceInput
                  label="Speak village name"
                  onResult={(value) =>
                    setAshaForm((p) => ({
                      ...p,
                      village: value,
                    }))
                  }
                />
              </div>
            </div>
          ) : step === 4 ? (
            <Field
              label="Phone number"
              type="tel"
              inputMode="tel"
              placeholder="10-digit phone number"
              value={ashaForm.phone}
              onChange={setAsha("phone")}
              autoFocus
              required
            />
          ) : step === 5 ? (
            <SelectField
              label="Preferred language"
              value={ashaForm.language}
              onChange={setAsha("language")}
              options={[
                ["te", "Telugu"],
                ["ml", "Malayalam"],
                ["pa", "Punjabi"],
                ["en", "English"],
              ]}
            />
          ) : step === 6 ? (
            <>
              <Field
                label="Pregnancy start date"
                type="date"
                value={ashaForm.pregnancy_start_date}
                onChange={setAsha("pregnancy_start_date")}
                autoFocus
                required
              />

              <Field
                label="Estimated due date (optional)"
                type="date"
                value={ashaForm.delivery_date}
                onChange={setAsha("delivery_date")}
              />
            </>
          ) : step === 7 ? (
            <fieldset className="field-group">
              <legend>Conditions</legend>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={ashaForm.conditions.gestational_diabetes}
                  onChange={setAshaCondition("gestational_diabetes")}
                />
                <span>Gestational diabetes</span>
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={ashaForm.conditions.hypertensive_in_pregnancy}
                  onChange={setAshaCondition("hypertensive_in_pregnancy")}
                />
                <span>High blood pressure during pregnancy</span>
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={ashaForm.conditions.significant_blood_loss}
                  onChange={setAshaCondition("significant_blood_loss")}
                />
                <span>Significant blood loss</span>
              </label>

              <p className="field-help">
                Leave everything unchecked if none apply.
              </p>
            </fieldset>
          ) : step === 8 ? (
            <div className="field-group">
              <div className="button-row" style={{ alignItems: "flex-end" }}>
                <Field
                  label="Medicines"
                  placeholder="e.g. Iron tablets, calcium"
                  value={ashaForm.medications}
                  onChange={setAsha("medications")}
                  autoFocus
                />

                <VoiceInput
                  label="Speak medicines"
                  onResult={(value) =>
                    setAshaForm((p) => ({
                      ...p,
                      medications: value,
                    }))
                  }
                />
              </div>
            </div>
          ) : step === 9 ? (
            <div className="field-group">
              <div className="button-row" style={{ alignItems: "flex-end" }}>
                <Field
                  label="Food preferences"
                  placeholder="e.g. vegetarian, avoids spicy food"
                  value={ashaForm.food_preferences}
                  onChange={setAsha("food_preferences")}
                  autoFocus
                />

                <VoiceInput
                  label="Speak food preferences"
                  onResult={(value) =>
                    setAshaForm((p) => ({
                      ...p,
                      food_preferences: value,
                    }))
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <fieldset className="field-group">
                <legend>Consent</legend>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={ashaForm.consent}
                    onChange={(e) =>
                      setAshaForm((p) => ({
                        ...p,
                        consent: e.target.checked,
                      }))
                    }
                    required
                  />
                  <span>
                    The mother understands and agrees to creating this
                    continuity record.
                  </span>
                </label>
              </fieldset>

              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}

              <div className="button-row">
                <Button
                  type="button"
                  tone="secondary"
                  onClick={() => setStep(9)}
                >
                  Back
                </Button>

                <Button type="submit" disabled={busy || !ashaForm.consent}>
                  {busy ? "Saving…" : "Create record"}{" "}
                  <Icon name="check" />
                </Button>
              </div>
            </>
          )}

          <div className="button-row">
            {step > 1 && (
              <Button
                type="button"
                tone="secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}

            <Button type="submit">
              Continue <Icon name="arrow" />
            </Button>
          </div>
        </form>
      </AppShell>
    );
  }

  if (created) {
    const pendingSync = created.pending_sync;

    return (
      <AppShell role={role}>
        <div className="success-state">
          <PixelArt kind="success" />
          <div className="display display-lg">
            {pendingSync
              ? `${created.woman_name} is saved offline.`
              : `${created.name} is enrolled.`}
          </div>
          <p>
            {pendingSync
              ? "This record is safely stored on this device and will sync when the connection returns. A Mother ID will be created after sync."
              : "Her care journey has started."}
          </p>
          <div className="button-row">
            {!pendingSync && created.id && (
              <Link to={`/m/${created.id}`}>
                <Button>View journey</Button>
              </Link>
            )}
            <Link to="/a">
              <Button tone={pendingSync ? "primary" : "secondary"}>
                See ASHA queue
              </Button>
            </Link>
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

            <SelectField
              label="Pregnancy status"
              value={f.pregnancy_status}
              onChange={set("pregnancy_status")}
              options={[
                ["pregnant", "Currently pregnant"],
                ["delivered", "Already delivered"],
              ]}
            />

            {f.pregnancy_status === "pregnant" ? (
              <Field
                label="Last menstrual period (LMP)"
                type="date"
                value={f.pregnancy_start_date}
                onChange={set("pregnancy_start_date")}
                required
              />
            ) : (
              <>
                <Field
                  label="Delivery date"
                  type="date"
                  value={f.delivery_date}
                  onChange={set("delivery_date")}
                  required
                />
                <SelectField
                  label="Mode of delivery"
                  value={f.mode_of_delivery}
                  onChange={set("mode_of_delivery")}
                  options={[
                    ["normal", "Normal"],
                    ["LSCS", "C-section (LSCS)"],
                    ["assisted", "Assisted"],
                  ]}
                />
              </>
            )}

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
