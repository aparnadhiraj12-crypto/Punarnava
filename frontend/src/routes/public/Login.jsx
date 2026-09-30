// /login - restyled with the redesign's split auth-panel / auth-illustration layout.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/Brand";
import Button from "../../components/Button";
import Field from "../../components/Field";
import PixelArt from "../../components/PixelArt";
import { login, getMe } from "../../lib/api";
import { saveSession, homeFor } from "../../lib/session";
import { friendlyAuthError } from "../../lib/errors";

export default function Login() {
  const nav = useNavigate();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await login({ phone_or_email: id.trim(), password: pw });
      let name = "";
      try { name = (await getMe(res.token)).name ?? ""; } catch { /* name is optional */ }
      saveSession(res, name);
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
          <div className="eyebrow">Good to see you</div>
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
        <div className="auth-switch">
          New to Punarnava?
          <Link to="/signup"><Button tone="quiet">Create an account</Button></Link>
        </div>
      </section>
      <aside className="auth-illustration">
        <PixelArt kind="mother" />
        <p>"A health record that never closes."</p>
      </aside>
    </main>
  );
}
