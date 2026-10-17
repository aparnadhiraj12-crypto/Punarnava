import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";
const SESSION_KEY = "punarnava_clinician_session";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || response.statusText || "Request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return session?.token && ["clinic", "doctor"].includes(session.role) ? session : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function label(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const LANGUAGE_NAMES = {
  en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", kn: "Kannada", ml: "Malayalam",
  mr: "Marathi", bn: "Bengali", gu: "Gujarati", pa: "Punjabi", or: "Odia", od: "Odia",
  as: "Assamese", ur: "Urdu",
};

function languageName(value) {
  if (!value) return "Not recorded";
  const key = String(value).trim().toLowerCase();
  return LANGUAGE_NAMES[key] || label(value);
}

function errorMessage(error) {
  if (error?.status === 429) return "Too many failed sign-in attempts. This login is locked for 15 minutes. Try again later.";
  if (error?.status === 401) return "Your session has expired. Sign in again to continue.";
  if (error?.status === 403) return "This account cannot access clinician records.";
  if (error?.status === 404) return "No patient was found with that unique code.";
  if (error instanceof TypeError) return "The records service could not be reached. Check that the backend is running.";
  return error?.message || "The request could not be completed.";
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function toIntOrNull(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : Number(text);
}

async function loadHistory(id, token) {
  const encoded = encodeURIComponent(id);
  const paths = [
    `/record/women/${encoded}/interactions`,
    `/record/women/${encoded}/visits`,
    `/clinical/medication/${encoded}`,
    `/clinical/bp/${encoded}`,
  ];
  const results = await Promise.allSettled(paths.map((path) => request(path, { token })));
  const unauthorized = results.find((result) => result.status === "rejected" && result.reason?.status === 401);
  if (unauthorized) throw unauthorized.reason;
  const [interactions, visits, medications, bp] = results;
  return {
    history: {
      interactions: interactions.status === "fulfilled" ? (Array.isArray(interactions.value) ? interactions.value : interactions.value.interactions || []) : [],
      visits: visits.status === "fulfilled" ? (visits.value.entries || []) : [],
      medications: medications.status === "fulfilled" ? (medications.value.entries || []) : [],
      bp: bp.status === "fulfilled" ? (bp.value.entries || []) : [],
    },
    failed: results.some((result) => result.status === "rejected"),
  };
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [signupRole, setSignupRole] = useState("doctor");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [code, setCode] = useState("");
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");

  function switchAuthMode(next) {
    if (loginBusy) return;
    setAuthMode(next);
    setLoginError("");
    setPassword("");
  }

  async function signIn(event) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    const creating = authMode === "signup";
    try {
      const body = { phone_or_email: contact.trim(), password };
      if (creating) {
        body.role = signupRole;
        body.name = fullName.trim();
        if (inviteCode.trim()) body.invite_code = inviteCode.trim();
      }
      const result = await request(creating ? "/auth/signup" : "/auth/login", { method: "POST", body });
      if (!["clinic", "doctor"].includes(result.role)) {
        await request("/auth/logout", { method: "POST", token: result.token }).catch(() => {});
        throw new Error("Use a clinic or doctor account to access this portal.");
      }
      const clinicianSession = { token: result.token, role: result.role };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(clinicianSession));
      setSession(clinicianSession);
      setPassword("");
      setInviteCode("");
    } catch (error) {
      setLoginError(error?.status === 401 || (creating && error?.status && error.status < 500 && error.status !== 429) ? (error.message || "Incorrect phone/email or password.") : errorMessage(error));
    } finally {
      setLoginBusy(false);
    }
  }

  async function searchPatient(event) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode || !session) return;

    setLookupBusy(true);
    setLookupError("");
    setHistoryNotice("");
    setPatient(null);
    setHistory(null);

    try {
      const record = await request(`/record/lookup/${encodeURIComponent(normalizedCode)}`, { token: session.token });
      setPatient(record);
      const { history: loaded, failed } = await loadHistory(record.id, session.token);
      setHistory(loaded);
      if (failed) setHistoryNotice("Some history sections could not be loaded. The patient record is still available.");
      setCode(normalizedCode);
    } catch (error) {
      setLookupError(errorMessage(error));
      if (error?.status === 401) signOut();
    } finally {
      setLookupBusy(false);
    }
  }

  async function signOut() {
    if (session?.token) {
      await request("/auth/logout", { method: "POST", token: session.token }).catch(() => {});
    }
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPatient(null);
    setHistory(null);
    setCode("");
  }

  async function refreshHistory() {
    if (!patient || !session) return;
    try {
      const { history: loaded, failed } = await loadHistory(patient.id, session.token);
      setHistory(loaded);
      setHistoryNotice(failed ? "Some history sections could not be loaded. The patient record is still available." : "");
    } catch (error) {
      if (error?.status === 401) {
        signOut();
      } else {
        setHistoryNotice("Saved, but the history could not be refreshed. Search again to reload it.");
      }
    }
  }

  if (!session) {
    return (
      <main className="sign-in-page">
        <header className="brand-lockup">
          <span className="brand-symbol" aria-hidden="true">P</span>
          <span><strong>PUNARNAVA</strong><small>CLINICIAN RECORDS</small></span>
        </header>
        <div className="sign-in-layout">
          <section className="sign-in-intro">
            <p className="eyebrow">Continuity of care</p>
            <h1>One record.<br />Across every visit.</h1>
            <p className="intro-copy">A secure workspace for clinicians to review a patient's care history using her unique patient code.</p>
            <div className="privacy-line"><span className="status-dot" /> Restricted to clinic and doctor accounts</div>
          </section>
          <form className="sign-in-form" onSubmit={signIn}>
            <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={authMode === "signin"} className={`auth-tab${authMode === "signin" ? " active" : ""}`} onClick={() => switchAuthMode("signin")}>Sign in</button>
              <button type="button" role="tab" aria-selected={authMode === "signup"} className={`auth-tab${authMode === "signup" ? " active" : ""}`} onClick={() => switchAuthMode("signup")}>Create account</button>
            </div>
            {authMode === "signin" && <p className="credentials-note">Use the email ID and password given to you by your clinic.</p>}
            <div className="form-heading">
              <p className="eyebrow">Clinician access</p>
              <h2>{authMode === "signin" ? "Sign in" : "Create account"}</h2>
              <p>{authMode === "signin" ? "Use your registered clinic or doctor account." : "Register a new doctor or clinic account."}</p>
            </div>
            {authMode === "signup" && (
              <>
                <span className="field-label" id="role-label">I am a</span>
                <div className="role-toggle" role="radiogroup" aria-labelledby="role-label">
                  {[["doctor", "Doctor"], ["clinic", "Clinic"]].map(([id, text]) => (
                    <button key={id} type="button" role="radio" aria-checked={signupRole === id} className={`role-option${signupRole === id ? " active" : ""}`} onClick={() => setSignupRole(id)}>{text}</button>
                  ))}
                </div>
                <label className="field-label" htmlFor="full-name">{signupRole === "clinic" ? "Clinic name" : "Your name"}</label>
                <input id="full-name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={signupRole === "clinic" ? "e.g. Janani Health Centre" : "e.g. Dr. Meera Rao"} required />
              </>
            )}
            <label className="field-label" htmlFor="contact">Phone or email</label>
            <input id="contact" type="text" autoComplete="username" value={contact} onChange={(event) => setContact(event.target.value)} required />
            <label className="field-label" htmlFor="password">Password{authMode === "signup" ? " (at least 4 characters)" : ""}</label>
            <input id="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={authMode === "signup" ? 4 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required />
            {authMode === "signup" && (
              <>
                <label className="field-label" htmlFor="invite-code">Staff invite code <span className="required-mark">required</span></label>
                <input id="invite-code" type="text" autoComplete="off" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="Given by the Punarnava team" required />
              </>
            )}
            {loginError && <p className="error-message" role="alert">{loginError}</p>}
            <button className="primary-button" type="submit" disabled={loginBusy}>{loginBusy ? (authMode === "signin" ? "Signing in…" : "Creating account…") : (authMode === "signin" ? "Sign in to records" : "Create account")}<span aria-hidden="true">→</span></button>
            <p className="form-footnote">{authMode === "signin" ? "New here? Choose “Create account” above." : "Patient information is available only after sign-in."}</p>
          </form>
        </div>
        <footer className="page-footer"><span>PUNARNAVA</span><span>Maternal care continuity</span></footer>
      </main>
    );
  }

  const timeline = [
    ...(history?.visits || []).map((item) => ({
      key: `visit-${item.id}`,
      date: item.visited_on,
      title: label(item.kind || "care visit"),
      detail: item.note,
      tag: "Visit",
      tone: "green",
    })),
    ...(history?.interactions || []).map((item, index) => ({
      key: `interaction-${item.id || item.at || index}`,
      date: item.at,
      title: label(item.outcome || "interaction recorded"),
      detail: item.reason,
      tag: "Follow-up",
      tone: item.outcome === "could_not_go" ? "amber" : "green",
    })),
    ...(history?.bp || []).map((item) => ({
      key: `bp-${item.id}`,
      date: item.measured_on || item.timestamp,
      title: `Blood pressure ${item.systolic}/${item.diastolic} mmHg`,
      detail: [item.pulse != null ? `Pulse ${item.pulse}` : null, item.note].filter(Boolean).join(" · "),
      tag: "BP reading",
      tone: "neutral",
    })),
    ...(patient?.milestones || []).map((item) => ({
      key: `milestone-${item.rule_id}`,
      date: item.due_date,
      title: label(item.type),
      detail: item.citation,
      tag: label(item.state),
      tone: item.state === "missed" || item.state === "due" ? "amber" : "neutral",
    })),
  ].sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));

  return (
    <main className="portal">
      <header className="topbar">
        <a className="brand-lockup" href="/" aria-label="Punarnava clinician records home">
          <span className="brand-symbol" aria-hidden="true">P</span>
          <span><strong>PUNARNAVA</strong><small>CLINICIAN RECORDS</small></span>
        </a>
        <div className="account-area"><span className="account-role"><span className="status-dot" />{session.role} workspace</span><button className="quiet-button" type="button" onClick={signOut}>Sign out</button></div>
      </header>

      <div className="workspace">
        <section className="workspace-heading">
          <div><p className="eyebrow">Patient records <span className="eyebrow-divider">/</span> Lookup</p><h1>Care history</h1></div>
          <p className="workspace-copy">Review recorded visits, follow-ups, and clinical details.</p>
        </section>

        <form className="lookup-bar" onSubmit={searchPatient}>
          <label htmlFor="patient-code"><span className="lookup-index">01</span><span><strong>Unique patient code</strong><small>Enter the code provided by the patient</small></span></label>
          <div className="lookup-controls"><input id="patient-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="PN-XXXXXX" autoComplete="off" spellCheck="false" required /><button className="primary-button" type="submit" disabled={lookupBusy}>{lookupBusy ? "Searching…" : "Find record"}<span aria-hidden="true">→</span></button></div>
          {lookupError && <p className="error-message lookup-error" role="alert">{lookupError}</p>}
        </form>

        {!patient && !lookupBusy && <section className="empty-workspace"><span className="empty-mark" aria-hidden="true">+</span><div><h2>Search for a patient record</h2><p>Patient details will appear here after a successful code lookup.</p></div></section>}
        {lookupBusy && <div className="loading-line" role="status"><span /> Retrieving patient history</div>}
        {patient && <>
          {historyNotice && <p className="notice-message" role="status">{historyNotice}</p>}
          <section className="patient-banner">
            <div className="patient-identity"><span className="patient-monogram" aria-hidden="true">{patient.name?.trim()?.[0]?.toUpperCase() || "P"}</span><div><p className="eyebrow">Patient record</p><h2>{patient.name}</h2><span className="patient-code">{patient.mother_code || code}</span></div></div>
            <div className="record-stamp"><span className="record-stamp-dot" />Record located</div>
          </section>

          <section className="facts-strip" aria-label="Patient details">
            <Fact label="Age" value={patient.age == null ? "Not recorded" : `${patient.age} years`} />
            <Fact label="Language" value={languageName(patient.language)} />
            <Fact label="Delivery date" value={formatDate(patient.delivery_date)} />
            <Fact label="Delivery mode" value={label(patient.mode_of_delivery) || "Not recorded"} />
            <Fact label="Postpartum" value={patient.postpartum_day == null ? "Not recorded" : `Day ${patient.postpartum_day}`} />
          </section>

          <div className="record-grid">
            <div className="record-main">
              <section className="record-section">
                <SectionHeading index="02" title="Clinical details" />
                <div className="clinical-details">
                  <div className="clinical-row"><span>Recorded conditions</span><div className="tag-list">{patient.clinical_events?.length ? patient.clinical_events.map((event, index) => <span className="data-tag" key={`${event.type}-${index}`}>{label(event.type)}</span>) : <span className="muted">None recorded</span>}</div></div>
                  <div className="clinical-row"><span>Haemoglobin at discharge</span><strong>{patient.discharge_hb == null ? "Not recorded" : `${patient.discharge_hb} g/dL`}</strong></div>
                  <div className="clinical-row"><span>Village</span><strong>{patient.village || "Not recorded"}</strong></div>
                </div>
                <div className="medication-heading"><h3>Prescribed medication</h3><span>{history?.medications?.length || 0} entries</span></div>
                {history?.medications?.length ? <ul className="medication-list">{history.medications.map((item) => <li key={item.id}><div><strong>{item.medication_name || "Medication"}</strong><span>{[item.dosage, item.instructions].filter(Boolean).join(" · ") || "Details not recorded"}</span></div><small>{formatDate(item.timestamp)}</small></li>)}</ul> : <p className="muted compact-empty">No prescribed medication recorded.</p>}
                <div className="medication-heading"><h3>Medicines recorded at enrollment</h3><span>{patient.medications?.length || 0} entries</span></div>
                {patient.medications?.length ? <ul className="medication-list">{patient.medications.map((item, index) => <li key={`${item}-${index}`}><div><strong>{item}</strong><span>Recorded during enrollment</span></div></li>)}</ul> : <p className="muted compact-empty">No medicines recorded at enrollment.</p>}
              </section>

              <section className="record-section">
                <SectionHeading index="03" title="Blood pressure readings" />
                {history?.bp?.length ? <ul className="medication-list bp-list">{history.bp.map((item) => <li key={item.id}><div><strong>{item.systolic}/{item.diastolic} mmHg</strong><span>{[item.pulse != null ? `Pulse ${item.pulse}` : null, item.note].filter(Boolean).join(" · ") || "No pulse or note recorded"}</span></div><small>{formatDate(item.measured_on || item.timestamp)}</small></li>)}</ul> : <p className="muted compact-empty">No blood pressure readings recorded.</p>}
              </section>

              <ClinicalForm patient={patient} token={session.token} onSaved={refreshHistory} onUnauthorized={signOut} />

              <section className="record-section history-section">
                <SectionHeading index="05" title="Continuity history" />
                {timeline.length ? <ol className="history-list">{timeline.map((item) => <li className="history-item" key={item.key}><span className={`history-marker ${item.tone}`} /><div className="history-entry"><div className="history-meta"><time>{formatDate(item.date)}</time><span className={`history-tag ${item.tone}`}>{item.tag}</span></div><h3>{item.title}</h3>{item.detail && <p>{item.detail}</p>}</div></li>)}</ol> : <p className="muted compact-empty">No visits, follow-ups, or milestones recorded.</p>}
              </section>
            </div>
            <aside className="record-aside">
              <section className="aside-section"><SectionHeading index="04" title="Record notes" /><dl className="aside-facts"><div><dt>Pregnancy start</dt><dd>{formatDate(patient.pregnancy_start_date)}</dd></div><div><dt>Estimated due date</dt><dd>{formatDate(patient.estimated_due_date)}</dd></div><div><dt>Phone</dt><dd>{patient.phone || "Not recorded"}</dd></div><div><dt>Food preferences</dt><dd>{patient.food_preferences?.length ? patient.food_preferences.join(", ") : "Not recorded"}</dd></div><div><dt>Consent recorded</dt><dd>{patient.consent == null ? "Not recorded" : patient.consent ? "Yes" : "No"}</dd></div><div><dt>Record status</dt><dd>{patient.incomplete ? "Incomplete" : "Available"}</dd></div></dl></section>
              <div className="privacy-note"><span className="privacy-symbol" aria-hidden="true">i</span><p>This record contains information entered by the patient and care team. Review entries in their recorded context.</p></div>
            </aside>
          </div>
        </>}
        <footer className="workspace-footer"><span>Patient data is protected by clinician sign-in.</span><span>PUNARNAVA · CARE CONTINUITY</span></footer>
      </div>
    </main>
  );
}

function Fact({ label: title, value }) {
  return <div className="fact"><span>{title}</span><strong>{value}</strong></div>;
}

function SectionHeading({ index, title }) {
  return <div className="section-heading"><span>{index}</span><h2>{title}</h2></div>;
}
function ClinicalForm({ patient, token, onSaved, onUnauthorized }) {
  const [tab, setTab] = useState("prescription");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rx, setRx] = useState({ medication_name: "", dosage: "", instructions: "" });
  const [bp, setBp] = useState({ systolic: "", diastolic: "", pulse: "", measured_on: "", note: "" });

  function switchTab(next) {
    if (busy) return;
    setTab(next);
    setError("");
    setSuccess("");
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (tab === "prescription") {
        await request("/clinical/medication", {
          method: "POST",
          token,
          body: {
            woman_id: patient.id,
            medication_name: rx.medication_name.trim(),
            dosage: rx.dosage.trim() || null,
            instructions: rx.instructions.trim() || null,
          },
        });
        setRx({ medication_name: "", dosage: "", instructions: "" });
      } else {
        await request("/clinical/bp", {
          method: "POST",
          token,
          body: {
            woman_id: patient.id,
            systolic: toIntOrNull(bp.systolic),
            diastolic: toIntOrNull(bp.diastolic),
            pulse: toIntOrNull(bp.pulse),
            measured_on: bp.measured_on || null,
            note: bp.note.trim() || null,
          },
        });
        setBp({ systolic: "", diastolic: "", pulse: "", measured_on: "", note: "" });
      }
      setSuccess("Saved. It will appear in her app.");
      await onSaved();
    } catch (err) {
      if (err?.status === 401) {
        onUnauthorized();
        return;
      }
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const setRxField = (key) => (event) => setRx((current) => ({ ...current, [key]: event.target.value }));
  const setBpField = (key) => (event) => setBp((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className="record-section add-section">
      <SectionHeading index="04" title="Add to her record" />
      <div className="tab-row" role="tablist" aria-label="Type of entry">
        <button type="button" role="tab" aria-selected={tab === "prescription"} className={`tab-button${tab === "prescription" ? " active" : ""}`} onClick={() => switchTab("prescription")}>Prescription</button>
        <button type="button" role="tab" aria-selected={tab === "bp"} className={`tab-button${tab === "bp" ? " active" : ""}`} onClick={() => switchTab("bp")}>Blood pressure</button>
      </div>
      <form className="entry-form" onSubmit={submit}>
        {tab === "prescription" ? (
          <>
            <label className="field-label" htmlFor="rx-name">Medicine name <span className="required-mark">required</span></label>
            <input id="rx-name" value={rx.medication_name} onChange={setRxField("medication_name")} required autoComplete="off" />
            <div className="form-row">
              <div><label className="field-label" htmlFor="rx-dosage">Dosage</label><input id="rx-dosage" value={rx.dosage} onChange={setRxField("dosage")} placeholder="1 daily" autoComplete="off" /></div>
              <div><label className="field-label" htmlFor="rx-instructions">Instructions</label><input id="rx-instructions" value={rx.instructions} onChange={setRxField("instructions")} placeholder="After food, for 3 months" autoComplete="off" /></div>
            </div>
          </>
        ) : (
          <>
            <div className="form-row">
              <div><label className="field-label" htmlFor="bp-sys">Systolic <span className="required-mark">required</span></label><input id="bp-sys" type="number" inputMode="numeric" step="1" value={bp.systolic} onChange={setBpField("systolic")} required /></div>
              <div><label className="field-label" htmlFor="bp-dia">Diastolic <span className="required-mark">required</span></label><input id="bp-dia" type="number" inputMode="numeric" step="1" value={bp.diastolic} onChange={setBpField("diastolic")} required /></div>
            </div>
            <div className="form-row">
              <div><label className="field-label" htmlFor="bp-pulse">Pulse</label><input id="bp-pulse" type="number" inputMode="numeric" step="1" value={bp.pulse} onChange={setBpField("pulse")} /></div>
              <div><label className="field-label" htmlFor="bp-date">Measured on</label><input id="bp-date" type="date" max={todayISO()} value={bp.measured_on} onChange={setBpField("measured_on")} /></div>
            </div>
            <label className="field-label" htmlFor="bp-note">Note</label>
            <input id="bp-note" value={bp.note} onChange={setBpField("note")} placeholder="Seated, left arm" autoComplete="off" />
          </>
        )}
        {error && <p className="error-message" role="alert">{error}</p>}
        {success && <p className="success-message" role="status">{success}</p>}
        <button className="primary-button entry-submit" type="submit" disabled={busy}>{busy ? "Saving…" : tab === "prescription" ? "Save prescription" : "Save reading"}</button>
      </form>
    </section>
  );
}
