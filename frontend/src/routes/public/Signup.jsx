// /signup - mothers only. ASHA, doctor and clinic accounts are created by the
// Punarnava team and use the normal Log in page. A mother says whether she is
// pregnant or has recently given birth, and the form asks only what fits.
// Field names follow POST /api/auth/signup (guide 2.2).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/Brand";
import Button from "../../components/Button";
import Field, { SelectField } from "../../components/Field";
import Icon from "../../components/Icon";
import PixelArt from "../../components/PixelArt";
import { signup } from "../../lib/api";
import { saveSession, homeFor } from "../../lib/session";
import { friendlyAuthError } from "../../lib/errors";

const STATUSES = [
  { id: "pregnant", label: "I'm pregnant", icon: "heart" },
  { id: "delivered", label: "I recently gave birth", icon: "leaf" },
];

// Today as YYYY-MM-DD in the phone's own time zone, used to stop future dates.
function todayLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function Signup() {
  const nav = useNavigate();
  const [status, setStatus] = useState(""); // "pregnant" | "delivered" | "" (not chosen yet)
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [spousePhone, setSpousePhone] = useState("");
  const [start, setStart] = useState("");
  const [delivery, setDelivery] = useState("");
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!status) {
      setError("Please choose whether you are pregnant or have recently given birth.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      role: "mother",
      name: name.trim(),
      phone_or_email: id.trim(),
      password: pw,
      pregnancy_status: status,
      spouse_phone: spousePhone.trim() || undefined,
    };
    if (status === "pregnant") {
      if (start) payload.pregnancy_start_date = start;
    } else {
      payload.delivery_date = delivery;
      if (mode) payload.mode_of_delivery = mode;
    }
    try {
      const res = await signup(payload);
      saveSession(res, payload.name);
      nav(homeFor(res.role, res.linked_id));
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link to="/" className="auth-brand"><Brand /></Link>
      <section className="auth-panel">
        <div className="auth-copy">
          <div className="eyebrow">Your care record begins here</div>
          <div className="display display-lg">Let's get you started.</div>
          <p>Tell us where you are in your journey.</p>
        </div>

        <div className="role-picker" role="radiogroup" aria-label="Where are you in your journey?">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={status === s.id}
              onClick={() => { setStatus(s.id); setError(""); }}
              className={status === s.id ? "role active" : "role"}
            >
              <Icon name={s.icon} />
              <span>{s.label}</span>
              {status === s.id && <Icon name="check" />}
            </button>
          ))}
        </div>

        <div className="steps">
          <span className="active" /><span />
          <small>Step 1 of 1</small>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <Field label="Your name" placeholder="e.g. Lakshmi Rao"
            value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          <Field label="Phone or email" placeholder="+91 98765 43210" value={id}
            onChange={(e) => setId(e.target.value)} required autoComplete="username" />
          <Field label="Password (at least 8 characters)" type="password" minLength={8} value={pw}
            onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" />

          <Field
            label="Spouse / Partner's phone number (optional)"
            placeholder="+91 98765 43210"
            value={spousePhone}
            onChange={(e) => setSpousePhone(e.target.value)}
            autoComplete="tel"
          />
          <p className="section-note" style={{ marginTop: "-0.4rem", marginBottom: "0.2rem" }}>
            We'll send your partner appointment notifications and stage-specific guidance on how they can support you mentally. They will not have full access to your medical app.
          </p>

          {status === "pregnant" && (
            <>
              <Field label="First day of your last period (optional)" type="date" value={start}
                max={todayLocal()} onChange={(e) => setStart(e.target.value)} />
              <p className="section-note">Not sure? You can leave it empty.</p>
            </>
          )}

          {status === "delivered" && (
            <>
              <Field label="Delivery date" type="date" value={delivery}
                max={todayLocal()} onChange={(e) => setDelivery(e.target.value)} required />
              <SelectField label="Mode of delivery (optional)" value={mode} onChange={(e) => setMode(e.target.value)}
                options={[["", "Not sure"], ["normal", "Normal"], ["LSCS", "C-section (LSCS)"], ["assisted", "Assisted"]]} />
            </>
          )}

          {error && <p role="alert" className="form-error">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Creating account…" : "Continue"} <Icon name="arrow" /></Button>
        </form>

        <div className="auth-switch">
          Already have an account?
          <Link to="/login"><Button tone="quiet">Log in</Button></Link>
        </div>
      </section>
      <aside className="auth-illustration">
        <PixelArt kind="mother" />
        <p>"A health record that never closes."</p>
      </aside>
    </main>
  );
}