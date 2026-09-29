import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Page from "../../components/Page";
import { signup } from "../../lib/api";
import { saveSession, homeFor } from "../../lib/session";
import { friendlyAuthError } from "./Login";

const ROLES = [
  { id: "mother", label: "Mother" },
  { id: "asha", label: "ASHA" },
  { id: "clinic", label: "Clinic" },
];
const input = "mt-1 w-full border-2 border-ink/60 bg-paper px-3 py-2";

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
    <Page title="Sign up">
      <form onSubmit={submit} className="pixel-card space-y-4">
        <div role="radiogroup" aria-label="I am a" className="flex gap-2">
          {ROLES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={role === r.id}
                    onClick={() => setRole(r.id)}
                    className={role === r.id ? "pixel-btn-primary flex-1" : "pixel-btn-secondary flex-1"}>
              {r.label}
            </button>
          ))}
        </div>

        <label className="block"><span className="text-sm text-earth">Name</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></label>
        <label className="block"><span className="text-sm text-earth">Phone or email</span>
          <input className={input} value={id} onChange={(e) => setId(e.target.value)} required autoComplete="username" /></label>
        <label className="block"><span className="text-sm text-earth">Password (at least 4 characters)</span>
          <input type="password" minLength={4} className={input} value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" /></label>

        {role === "mother" && (
          <>
            <label className="block"><span className="text-sm text-earth">Delivery date</span>
              <input type="date" className={input} value={delivery} onChange={(e) => setDelivery(e.target.value)} required /></label>
            <label className="block"><span className="text-sm text-earth">Mode of delivery (optional)</span>
              <select className={input} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="">Not sure</option>
                <option value="normal">Normal</option>
                <option value="LSCS">C-section (LSCS)</option>
                <option value="assisted">Assisted</option>
              </select></label>
          </>
        )}

        {error && <p role="alert" className="text-clay font-medium">{error}</p>}
        <button className="pixel-btn-primary w-full" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
      </form>
      <p className="text-sm mt-4">Already have an account? <Link to="/login" className="underline">Log in</Link></p>
    </Page>
  );
}
