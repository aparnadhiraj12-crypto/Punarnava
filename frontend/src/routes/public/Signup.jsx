// /signup - role picker (mother / ASHA / clinic) + fields, matching the redesign's
// auth-panel layout. Field names follow POST /api/auth/signup exactly (guide 2.2).
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

const ROLES = [
  { id: "mother", label: "Mother", icon: "heart" },
  { id: "asha", label: "ASHA", icon: "people" },
  { id: "clinic", label: "Clinic", icon: "clinic" },
];

export default function Signup() {
  const nav = useNavigate();
  const [role, setRole] = useState("mother");
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [delivery, setDelivery] = useState("");
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = { role, name: name.trim(), phone_or_email: id.trim(), password: pw };
    if (role === "mother") {
      if (delivery) payload.delivery_date = delivery;
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
          <p>Choose how you'll use Punarnava.</p>
        </div>

        <div className="role-picker" role="radiogroup" aria-label="I am a">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={role === r.id}
              onClick={() => setRole(r.id)}
              className={role === r.id ? "role active" : "role"}
            >
              <Icon name={r.icon} />
              <span>I'm a{r.id === "asha" ? "n" : ""} {r.label.toLowerCase()}</span>
              {role === r.id && <Icon name="check" />}
            </button>
          ))}
        </div>

        <div className="steps">
          <span className="active" /><span />
          <small>Step 1 of 1</small>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <Field label={role === "clinic" ? "Clinic name" : "Your name"}
                 placeholder={role === "clinic" ? "e.g. Janani Health Centre" : "e.g. Lakshmi Rao"}
                 value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          <Field label="Phone or email" placeholder="+91 98765 43210" value={id}
                 onChange={(e) => setId(e.target.value)} required autoComplete="username" />
          <Field label="Password (at least 4 characters)" type="password" minLength={4} value={pw}
                 onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" />

          {role === "mother" && (
            <>
              <Field label="Delivery date" type="date" value={delivery}
                     onChange={(e) => setDelivery(e.target.value)} required />
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
        <PixelArt kind={role === "mother" ? "mother" : role === "asha" ? "worker" : "clinic"} />
        <p>"A health record that never closes."</p>
      </aside>
    </main>
  );
}
