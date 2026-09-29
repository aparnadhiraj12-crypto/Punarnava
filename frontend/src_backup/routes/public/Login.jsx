import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Page from "../../components/Page";
import { login, getMe } from "../../lib/api";
import { saveSession, homeFor } from "../../lib/session";

export function friendlyAuthError(err) {
  if (err.status === 401) return "That phone/email and password don't match. Check them and try again.";
  if (err.status === 409) return "An account with these details already exists. Try logging in instead.";
  if (err.status === 400) return "Please check your details. The password needs at least 4 characters.";
  return "Can't reach the server. Check that the backend is running, then try again.";
}

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
    <Page title="Log in">
      <form onSubmit={submit} className="pixel-card space-y-4">
        <label className="block">
          <span className="text-sm text-earth">Phone or email</span>
          <input className="mt-1 w-full border-2 border-ink/60 bg-paper px-3 py-2" value={id}
                 onChange={(e) => setId(e.target.value)} required autoComplete="username" />
        </label>
        <label className="block">
          <span className="text-sm text-earth">Password</span>
          <input type="password" className="mt-1 w-full border-2 border-ink/60 bg-paper px-3 py-2" value={pw}
                 onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p role="alert" className="text-clay font-medium">{error}</p>}
        <button className="pixel-btn-primary w-full" disabled={busy}>{busy ? "Logging in..." : "Log in"}</button>
      </form>
      <p className="text-sm mt-4">No account yet? <Link to="/signup" className="underline">Sign up</Link></p>
    </Page>
  );
}
