// /login - restyled with the redesign's split auth-panel / auth-illustration layout.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/Brand";
import Button from "../../components/Button";
import Field from "../../components/Field";
import PixelArt from "../../components/PixelArt";
import { login, getMe, getWoman, updatePartnerPhone } from "../../lib/api";
import { saveSession, homeFor, getHint, rememberContact, forgetHint } from "../../lib/session";
import { friendlyAuthError } from "../../lib/errors";

export default function Login() {
  const nav = useNavigate();
  const hint = getHint();
  const [id, setId] = useState(hint.contact || "");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [phoneSetup, setPhoneSetup] = useState(null);
  const [spousePhone, setSpousePhone] = useState("");

  async function savePhone(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updatePartnerPhone(phoneSetup.id, spousePhone);
      nav(phoneSetup.home, { replace: true });
    } catch (err) {
      setError(err.message || "Could not save the number. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await login({ phone_or_email: id.trim(), password: pw });
      let name = "";
      try { name = (await getMe(res.token)).name ?? ""; } catch { /* name is optional */ }
      saveSession(res, name);
      rememberContact(id.trim());
      const home = homeFor(res.role, res.linked_id);
      if (res.role === "mother" && res.linked_id) {
        let record;
        try {
          record = await getWoman(res.linked_id);
        } catch {
          // She can still reach Journey and update her number from Family later.
        }
        if (record && !record.spouse_phone?.trim()) {
          setPhoneSetup({ id: res.linked_id, home });
          return;
        }
      }
      nav(home);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  if (phoneSetup) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <h1>Add your husband's or spouse's number</h1>
          <p>Save a number for appointment reminders. You choose when to send each SMS.</p>
          <form className="auth-form" onSubmit={savePhone}>
            <Field label="Spouse's mobile number" type="tel" inputMode="tel"
              placeholder="+91 98765 43210" value={spousePhone} required
              onChange={(event) => setSpousePhone(event.target.value)} />
            {error && <p role="alert" className="form-error">{error}</p>}
            <Button type="submit" disabled={busy}>Save and continue</Button>
            <Button type="button" tone="quiet" disabled={busy}
              onClick={() => nav(phoneSetup.home, { replace: true })}>Skip for now</Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <Link to="/" className="auth-brand"><Brand /></Link>
      <section className="auth-panel">
        <div className="auth-copy">
          <div className="eyebrow">{hint.role === "asha" ? "Welcome back, ASHA worker" : hint.role === "mother" ? "Welcome back, mother" : "Good to see you"}</div>
          <div className="display display-lg">Welcome back.</div>
          <p>Your journey continues here.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <Field label="Phone or email" placeholder="+91 98765 43210" value={id}
            onChange={(e) => setId(e.target.value)} required autoComplete="username" />
          <Field label="Password" type="password" placeholder="Enter your password" value={pw}
            onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" />
          {error && <p role="alert" className="form-error">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
        </form>
        <p className="section-note">
          ASHA worker or health centre staff? Log in above with the email and password your health centre gave you.
        </p>

        <div className="auth-switch">
          New to Punarnava?
          <Link to="/signup"><Button tone="quiet">Create an account</Button></Link>
        </div>
        {(hint.role || hint.contact) && (
          <div className="auth-switch">
            Not you?
            <Button tone="quiet" type="button" onClick={() => { forgetHint(); window.location.reload(); }}>Use a different account</Button>
          </div>
        )}
      </section>
      <aside className="auth-illustration">
        <PixelArt kind="mother" />
        <p>"A health record that never closes."</p>
      </aside>
    </main>
  );
}
