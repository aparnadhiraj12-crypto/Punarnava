import React, { useState } from "react";
import {
  login,
  signup,
  getMe,
  getWoman,
  recordVisit,
  getWellnessContent,
  getProviders,
  addJournalEntry,
  getJournal,
  getDangerSigns,
} from "./lib/api";
import { saveSession, getSession, currentWomanId } from "./lib/session";

const colors = {
  ink: "#25352d",
  cream: "#f7f0df",
  paper: "#fffaf0",
  green: "#718b5b",
  darkGreen: "#3f5d48",
  sage: "#a9b88f",
  peach: "#d99a76",
  yellow: "#e7c66a",
  brown: "#795b45",
};

function PixelLogo() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <span>✦</span>
      </div>
      <div>
        <div className="brand-name">PUNARNAVA</div>
        <div className="brand-subtitle">a new beginning</div>
      </div>
    </div>
  );
}

function PixelButton({ children, variant = "primary", onClick }) {
  return (
    <button className={`pixel-button ${variant}`} onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

function Nav({ onNavigate }) {
  return (
    <header className="top-nav">
      <PixelLogo />

      <nav>
        <button onClick={() => onNavigate("home")}>Home</button>
        <button onClick={() => onNavigate("journey")}>Your Journey</button>
        <button onClick={() => onNavigate("care")}>Care</button>
        <button onClick={() => onNavigate("about")}>About</button>
      </nav>

      <PixelButton variant="small" onClick={() => onNavigate("login")}>
        Sign in
      </PixelButton>
    </header>
  );
}

function Landscape() {
  return (
    <div className="soft-scene">
      <div className="scene-glow" />
      <div className="scene-sun" />

      <div className="scene-cloud cloud-one" />
      <div className="scene-cloud cloud-two" />

      <div className="scene-hill hill-back" />
      <div className="scene-hill hill-mid" />
      <div className="scene-hill hill-front" />

      <div className="scene-tree tree-left">
        <div className="tree-crown" />
        <div className="tree-trunk" />
      </div>

      <div className="scene-tree tree-right">
        <div className="tree-crown" />
        <div className="tree-trunk" />
      </div>

      <div className="scene-house">
        <div className="house-roof" />
        <div className="house-body">
          <div className="house-window">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="house-door" />
          <div className="house-plant" />
        </div>
      </div>

      <div className="scene-grass" />

      <div className="scene-note">
        <span>✦</span>
        <div>
          <strong>your care story</strong>
          <small>one day at a time</small>
        </div>
      </div>
    </div>
  );
}

function Landing({ onNavigate }) {
  return (
    <main className="landing">
      <Nav onNavigate={onNavigate} />

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="pixel-dot" />
            postpartum care, made human
          </div>

          <h1>
            Every new
            <br />
            beginning
            <br />
            <em>deserves care.</em>
          </h1>

          <p>
            PUNARNAVA brings mothers, ASHA workers and healthcare providers
            together through one gentle care journey.
          </p>

          <div className="hero-actions">
            <PixelButton onClick={() => onNavigate("signup")}>
              Begin your journey
            </PixelButton>

            <button
              className="text-button"
              onClick={() => onNavigate("journey")}
            >
              Explore the journey <span>→</span>
            </button>
          </div>

          <div className="hero-note">
            <span>✦</span>
            Built around the days that matter most.
          </div>
        </div>

        <div className="hero-art">
          <Landscape />

          <div className="art-card">
            <div className="tiny-sun">☀</div>
            <div>
              <strong>your care story</strong>
              <span>one day at a time</span>
            </div>
          </div>
        </div>
      </section>

      <section className="intro-strip">
        <div>
          <span className="strip-number">01</span>
          <strong>Notice</strong>
          <p>Understand what your body is telling you.</p>
        </div>

        <div>
          <span className="strip-number">02</span>
          <strong>Connect</strong>
          <p>Reach the right person when you need them.</p>
        </div>

        <div>
          <span className="strip-number">03</span>
          <strong>Recover</strong>
          <p>Build small, meaningful routines for healing.</p>
        </div>
      </section>
    </main>
  );
}

function Login({ onNavigate }) {
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login({
        phone_or_email: phoneOrEmail,
        password,
      });

      saveSession(result);

      const role =
        result?.user?.role ||
        result?.role ||
        "mother";

      if (role === "asha") {
        onNavigate("asha");
      } else if (role === "clinic") {
        onNavigate("clinic");
      } else {
        onNavigate("mother");
      }
    } catch (err) {
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <Landscape />
        <div className="auth-art-copy">
          <span className="eyebrow">PUNARNAVA</span>
          <h1>A gentle place<br />for your journey.</h1>
          <p>
            Care, reminders and support for every step after birth.
          </p>
        </div>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <PixelLogo />

          <div className="auth-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Come on in.</h2>
            <p>Your journey is waiting for you.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Phone or email
              <input
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                placeholder="Enter your phone or email"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            {error && <div className="form-error">{error}</div>}

            <button
              className="pixel-button primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          <div className="auth-footer">
            <span>New here?</span>
            <button
              className="text-button"
              onClick={() => onNavigate("signup")}
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Signup({ onNavigate }) {
  const [role, setRole] = useState("mother");
  const [name, setName] = useState("");
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signup({
        role,
        name: name.trim(),
        phone_or_email: phoneOrEmail.trim(),
        password,
      });

      saveSession(result);

      const returnedRole =
        result?.user?.role ||
        result?.role ||
        role;

      if (returnedRole === "asha") {
        onNavigate("asha");
      } else if (returnedRole === "clinic") {
        onNavigate("clinic");
      } else {
        onNavigate("mother");
      }
    } catch (err) {
      setError(
        err?.message ||
        "We could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-art">
        <Landscape />

        <div className="auth-message">
          <PixelLogo />
          <h1>A new chapter.</h1>
          <p>
            Let's make the journey a little gentler.
          </p>
        </div>
      </div>

      <div className="auth-panel">
        <button
          className="back-button"
          onClick={() => onNavigate("home")}
        >
          ← Back home
        </button>

        <div className="form-wrap">
          <span className="form-kicker">GET STARTED</span>

          <h2>Create your account</h2>

          <p className="form-description">
            Tell us a little about yourself.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="role-selector">
              <button
                type="button"
                className={role === "mother" ? "active" : ""}
                onClick={() => setRole("mother")}
              >
                Mother
              </button>

              <button
                type="button"
                className={role === "asha" ? "active" : ""}
                onClick={() => setRole("asha")}
              >
                ASHA worker
              </button>
            </div>

            <label>
              Your name

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
                required
              />
            </label>

            <label>
              Phone number or email

              <input
                type="text"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </label>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="pixel-button primary"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>

          <p className="bottom-link">
            Already have an account?{" "}
            <button onClick={() => onNavigate("login")}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

function SideNav({ page, onNavigate }) {
  const items = [
    ["mother", "⌂", "Home"],
    ["journey", "◌", "My journey"],
    ["care", "✿", "Wellness"],
    ["journal", "▤", "Journal"],
    ["safety", "!", "Safety"],
  ];

  return (
    <aside className="side-nav">
      <PixelLogo />

      <div className="side-section">
        <span className="side-label">MY SPACE</span>

        {items.map(([key, icon, label]) => (
          <button
            key={key}
            className={page === key ? "selected" : ""}
            onClick={() => onNavigate(key)}
          >
            <span className="side-icon">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="side-bottom">
        <div className="little-note">
          <span>☀</span>
          <div>
            <strong>Take it gently.</strong>
            <small>Healing takes time.</small>
          </div>
        </div>

        <button onClick={() => onNavigate("home")}>Sign out</button>
      </div>
    </aside>
  );
}

function MotherShell({ page, onNavigate, children }) {
  return (
    <div className="app-shell">
      <SideNav page={page} onNavigate={onNavigate} />

      <main className="dashboard">
        <div className="mobile-top">
          <PixelLogo />
          <button onClick={() => onNavigate("home")}>↪</button>
        </div>

        {children}
      </main>
    </div>
  );
}

function MotherHome({ onNavigate }) {
  const [mother, setMother] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  React.useEffect(() => {
    let active = true;

    async function loadMother() {
      try {
        const { token } = getSession();
        const result = await getMe(token);

        if (!active) return;

        setMother(result?.user || result?.woman || result);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "We could not load your journey.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMother();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-shell">
        <SideNav active="home" onNavigate={onNavigate} />

        <main className="dashboard-main">
          <div className="loading-state">
            <div className="loading-sun">☀</div>
            <h2>Preparing your journey...</h2>
            <p>Just a little moment.</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-shell">
        <SideNav active="home" onNavigate={onNavigate} />

        <main className="dashboard-main">
          <div className="error-state">
            <span>!</span>
            <h2>Something went wrong.</h2>
            <p>{error}</p>

            <button
              className="outline-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const name =
    mother?.name ||
    mother?.full_name ||
    "Mother";

  const week =
    mother?.postpartum_week ||
    mother?.week ||
    7;

  return (
    <div className="dashboard-shell">
      <SideNav active="home" onNavigate={onNavigate} />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">YOUR PUNARNAVA JOURNEY</span>
            <h1>Hello, {name} <span>✦</span></h1>
            <p className="dashboard-intro">
              One small step at a time. You are doing beautifully.
            </p>
          </div>

          <div className="week-badge">
            <span>WEEK</span>
            <strong>{week}</strong>
          </div>
        </div>

        <section className="home-landscape-card">
          <Landscape />

          <div className="landscape-message">
            <span className="eyebrow">TODAY</span>
            <h2>Your body is still healing.</h2>
            <p>
              Rest when you can, ask for help when you need it,
              and take today gently.
            </p>

            <button
              className="pixel-button primary"
              onClick={() => onNavigate("journey")}
            >
              See my journey →
            </button>
          </div>
        </section>

        <section className="dashboard-grid">
          <button
            className="feature-card sage"
            onClick={() => onNavigate("care")}
          >
            <span className="feature-icon">♡</span>
            <span className="eyebrow">WELLNESS</span>
            <h3>How are you feeling?</h3>
            <p>A quiet check-in for your body and mind.</p>
          </button>

          <button
            className="feature-card peach"
            onClick={() => onNavigate("journal")}
          >
            <span className="feature-icon">✎</span>
            <span className="eyebrow">MY JOURNAL</span>
            <h3>A little space for you.</h3>
            <p>Write down a thought, feeling or memory.</p>
          </button>

          <button
            className="feature-card yellow"
            onClick={() => onNavigate("safety")}
          >
            <span className="feature-icon">+</span>
            <span className="eyebrow">SAFETY</span>
            <h3>Know when to ask for help.</h3>
            <p>Simple guidance for signs that need attention.</p>
          </button>
        </section>
      </main>
    </div>
  );
}

function Journey({ onNavigate }) {
  const [woman, setWoman] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);

  async function loadJourney() {
    try {
      setLoading(true);
      setError("");

      const womanId = currentWomanId();
      const result = await getWoman(womanId);

      setWoman(result);
    } catch (err) {
      setError(err?.message || "We could not load your care journey.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadJourney();
  }, []);

  async function handleVisit(milestone, outcome) {
    if (!woman?.id) return;

    try {
      setSaving(milestone.rule_id);

      await recordVisit(
        woman.id,
        outcome,
        undefined,
        milestone.rule_id
      );

      await loadJourney();
    } catch (err) {
      setError(err?.message || "Could not save your response.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <MotherShell page="journey" onNavigate={onNavigate}>
        <div className="loading-state">
          <div className="loading-sun">☀</div>
          <h2>Loading your care journey...</h2>
          <p>Just a moment.</p>
        </div>
      </MotherShell>
    );
  }

  if (error) {
    return (
      <MotherShell page="journey" onNavigate={onNavigate}>
        <div className="error-state">
          <h2>We couldn't load your journey.</h2>
          <p>{error}</p>
          <button
            className="pixel-button primary"
            onClick={loadJourney}
          >
            Try again
          </button>
        </div>
      </MotherShell>
    );
  }

  const milestones = woman?.milestones || [];

  return (
    <MotherShell page="journey" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">YOUR CARE STORY</span>

        <h1>
          {woman?.name
            ? `${woman.name}'s journey.`
            : "The journey so far."}
        </h1>

        <p>
          Day {woman?.postpartum_day ?? "—"} after delivery
          {woman?.delivery_date
            ? ` · ${woman.delivery_date}`
            : ""}
          {woman?.mode_of_delivery
            ? ` · ${woman.mode_of_delivery}`
            : ""}
        </p>
      </div>

      {woman?.incomplete && (
        <div className="info-card">
          Some details are missing, so this journey may be incomplete.
        </div>
      )}

      {woman?.clinical_events?.length > 0 && (
        <div className="journey-tags">
          {woman.clinical_events.map((event, index) => (
            <span key={`${event.type}-${index}`} className="soft-tag">
              {event.type}
            </span>
          ))}
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="empty-state">
          <h2>Your journey is just beginning.</h2>
          <p>
            Your care milestones will appear here once they are available.
          </p>
        </div>
      ) : (
        <div className="timeline">
          {milestones.map((milestone, index) => {
            const actionable =
              milestone.state === "due" ||
              milestone.state === "missed";

            const completed =
              milestone.state === "done" ||
              milestone.state === "completed";

            return (
              <div
                className={`timeline-item ${
                  completed ? "done" : ""
                }`}
                key={milestone.rule_id || index}
              >
                <div className="timeline-marker">
                  <span>
                    {completed ? "✓" : String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="timeline-content">
                  <span>
                    {milestone.state
                      ? milestone.state.toUpperCase()
                      : "CARE MILESTONE"}
                  </span>

                  <h2>
                    {milestone.type || "Care visit"}
                  </h2>

                  <p>
                    Due {milestone.due_date || "—"}
                  </p>

                  {milestone.entitlement && (
                    <p>{milestone.entitlement}</p>
                  )}

                  {milestone.citation && (
                    <small>{milestone.citation}</small>
                  )}

                  {milestone.state === "missed" &&
                    milestone.days_overdue && (
                      <div className="timeline-note">
                        This visit is {milestone.days_overdue} days overdue.
                      </div>
                    )}

                  {actionable && (
                    <div className="timeline-actions">
                      <button
                        className="pixel-button primary"
                        disabled={saving === milestone.rule_id}
                        onClick={() =>
                          handleVisit(milestone, "done")
                        }
                      >
                        {saving === milestone.rule_id
                          ? "Saving..."
                          : "I went"}
                      </button>

                      <button
                        className="pixel-button secondary"
                        disabled={saving === milestone.rule_id}
                        onClick={() =>
                          handleVisit(
                            milestone,
                            "could_not_go"
                          )
                        }
                      >
                        Couldn't go
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MotherShell>
  );
}

function Wellness({ onNavigate }) {
  const [stage, setStage] = useState("");
  const [region, setRegion] = useState("");
  const [providerType, setProviderType] = useState("");
  const [language, setLanguage] = useState("");
  const [providerRegion, setProviderRegion] = useState("");

  const [content, setContent] = useState(null);
  const [providers, setProviders] = useState(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [error, setError] = useState("");

  async function loadContent() {
    try {
      setLoadingContent(true);
      setError("");

      const result = await getWellnessContent({
        stage: stage || undefined,
        region: region || undefined,
      });

      setContent(result);
    } catch (err) {
      setError(err?.message || "We could not load wellness content.");
    } finally {
      setLoadingContent(false);
    }
  }

  async function loadProviders() {
    try {
      setLoadingProviders(true);

      const result = await getProviders({
        type: providerType || undefined,
        language: language || undefined,
        region: providerRegion || undefined,
      });

      setProviders(result);
    } catch (err) {
      setError(err?.message || "We could not load providers.");
    } finally {
      setLoadingProviders(false);
    }
  }

  React.useEffect(() => {
    loadContent();
  }, [stage, region]);

  React.useEffect(() => {
    loadProviders();
  }, [providerType, language, providerRegion]);

  const items = content?.content || [];

  const diet = items.filter((item) => item.type === "diet");
  const exercise = items.filter((item) => item.type === "exercise");

  return (
    <MotherShell page="care" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">CARE FOR YOU</span>
        <h1>Small things that help.</h1>
        <p>
          Gentle, practical guidance for this stage of your journey.
        </p>
      </div>

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button
            className="pixel-button primary"
            onClick={() => {
              loadContent();
              loadProviders();
            }}
          >
            Try again
          </button>
        </div>
      )}

      <section className="care-section">
        <div className="section-heading-row">
          <div>
            <span className="date-line">WELLNESS</span>
            <h2>Guidance for where you are.</h2>
          </div>
        </div>

        <div className="filter-row">
          <label>
            <span>Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="">All stages</option>
              <option value="postpartum_early">
                Early postpartum
              </option>
              <option value="postpartum_six_week">
                Around six weeks
              </option>
            </select>
          </label>

          <label>
            <span>Region</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">All regions</option>
              <option value="general">General</option>
              <option value="kerala">Kerala</option>
              <option value="punjab">Punjab</option>
            </select>
          </label>
        </div>

        {loadingContent ? (
          <div className="loading-state">
            <div className="loading-sun">☀</div>
            <p>Loading wellness guidance...</p>
          </div>
        ) : (
          <>
            <div className="care-group">
              <h3>Diet</h3>

              {diet.length === 0 ? (
                <p className="empty-state">
                  No diet guidance matches these filters yet.
                </p>
              ) : (
                <div className="care-grid">
                  {diet.map((item) => (
                    <article className="care-card" key={item.id}>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>

                      {item.source_citation && (
                        <small>{item.source_citation}</small>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="care-group">
              <h3>Exercise</h3>

              {exercise.length === 0 ? (
                <p className="empty-state">
                  No exercise guidance matches these filters yet.
                </p>
              ) : (
                <div className="care-grid">
                  {exercise.map((item) => (
                    <article className="care-card" key={item.id}>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>

                      {item.source_citation && (
                        <small>{item.source_citation}</small>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="care-section" id="providers">
        <div className="section-heading-row">
          <div>
            <span className="date-line">SUPPORT</span>
            <h2>Find a professional.</h2>
          </div>
        </div>

        <p className="section-note">
          Sample directory entries provided by the backend.
        </p>

        <div className="filter-row">
          <label>
            <span>Type</span>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
            >
              <option value="">Any type</option>
              <option value="yoga">Yoga</option>
              <option value="dietitian">Dietitian</option>
              <option value="psychiatrist">Psychiatrist</option>
              <option value="counsellor">Counsellor</option>
            </select>
          </label>

          <label>
            <span>Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">Any language</option>
              <option value="en">English</option>
              <option value="te">Telugu</option>
              <option value="ml">Malayalam</option>
              <option value="pa">Punjabi</option>
            </select>
          </label>

          <label>
            <span>Region</span>
            <select
              value={providerRegion}
              onChange={(e) => setProviderRegion(e.target.value)}
            >
              <option value="">Any region</option>
              <option value="general">General</option>
              <option value="andhra_pradesh">
                Andhra Pradesh
              </option>
              <option value="kerala">Kerala</option>
              <option value="punjab">Punjab</option>
            </select>
          </label>
        </div>

        {loadingProviders ? (
          <div className="loading-state">
            <div className="loading-sun">☀</div>
            <p>Finding support options...</p>
          </div>
        ) : providers?.providers?.length ? (
          <div className="provider-list">
            {providers.providers.map((provider) => (
              <article
                className="provider-card"
                key={provider.id}
              >
                <div>
                  <h3>{provider.name}</h3>
                  <p>
                    {provider.type} · {provider.language} ·{" "}
                    {provider.region}
                  </p>
                </div>

                <span>{provider.contact}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>
              No professionals match these filters yet. Try
              widening the language or region.
            </p>
          </div>
        )}
      </section>
    </MotherShell>
  );
}

function Journal({ onNavigate }) {
  const [entries, setEntries] = useState([]);
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const moods = [
    { emoji: "🙂", label: "Good" },
    { emoji: "😐", label: "Okay" },
    { emoji: "😢", label: "Sad" },
    { emoji: "😴", label: "Tired" },
    { emoji: "😤", label: "Frustrated" },
  ];

  async function loadJournal() {
    try {
      setLoading(true);
      setError("");

      const womanId = currentWomanId();
      const result = await getJournal(womanId);

      setEntries(result?.entries || []);
    } catch (err) {
      setError(err?.message || "We could not load your journal.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadJournal();
  }, []);

  async function saveEntry() {
    if (!mood || saving) return;

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const womanId = currentWomanId();

      await addJournalEntry(
        womanId,
        mood,
        note.trim()
      );

      setMood("");
      setNote("");
      setSaved(true);

      await loadJournal();
    } catch (err) {
      setError(err?.message || "Could not save your entry.");
    } finally {
      setSaving(false);
    }
  }

  function showTime(timestamp) {
    if (!timestamp) return "";

    const hasZone =
      /[zZ]|[+-]\d\d:?\d\d$/.test(timestamp);

    const date = new Date(
      hasZone ? timestamp : `${timestamp}Z`
    );

    return isNaN(date)
      ? timestamp
      : date.toLocaleString();
  }

  return (
    <MotherShell page="journal" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">YOUR SPACE</span>
        <h1>A little space for you.</h1>
        <p>
          You can write whatever feels right. Nothing needs to be
          perfect.
        </p>
      </div>

      <section className="journal-card">
        <div className="journal-moods">
          {moods.map((item) => (
            <button
              key={item.emoji}
              type="button"
              aria-label={item.label}
              aria-pressed={mood === item.emoji}
              className={`mood-button ${
                mood === item.emoji ? "selected" : ""
              }`}
              onClick={() => {
                setMood(item.emoji);
                setSaved(false);
              }}
            >
              <span>{item.emoji}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>

        <label className="journal-note">
          <span>A note <em>(optional)</em></span>
          <textarea
            rows={5}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setSaved(false);
            }}
            placeholder="How are you feeling today?"
          />
        </label>

        <button
          className="pixel-button primary"
          disabled={!mood || saving}
          onClick={saveEntry}
        >
          {saving ? "Saving..." : "Save entry"}
        </button>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {saved && (
          <div className="journal-support">
            <strong>Your entry is saved.</strong>
            <p>
              If you would like to talk to someone, you can explore
              the{" "}
              <button
                type="button"
                onClick={() => onNavigate("care")}
              >
                directory of professionals
              </button>
              .
            </p>
          </div>
        )}
      </section>

      <section className="journal-history">
        <div className="section-heading-row">
          <div>
            <span className="date-line">YOUR NOTES</span>
            <h2>Past entries</h2>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-sun">☀</div>
            <p>Loading your journal...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <p>
              No entries yet. Choose a feeling above to add your
              first note.
            </p>
          </div>
        ) : (
          <div className="journal-entries">
            {entries.map((entry) => (
              <article
                className="journal-entry"
                key={entry.id}
              >
                <span className="journal-entry-mood">
                  {entry.mood_emoji}
                </span>

                <div>
                  <small>
                    {showTime(entry.timestamp)}
                  </small>

                  {entry.note && (
                    <p>{entry.note}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </MotherShell>
  );
}

function Safety({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSafety() {
    try {
      setLoading(true);
      setError("");

      const result = await getDangerSigns("en");
      setData(result);
    } catch (err) {
      setError(
        err?.message ||
        "We could not load the safety guidance."
      );
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadSafety();
  }, []);

  return (
    <MotherShell page="safety" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">PLEASE TAKE CARE</span>
        <h1>Not feeling well?</h1>
        <p>
          If something doesn't feel right, please take it
          seriously.
        </p>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-sun">☀</div>
          <h2>Loading safety guidance...</h2>
          <p>Just a moment.</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <h2>We couldn't load the guidance.</h2>
          <p>{error}</p>

          <button
            className="pixel-button primary"
            onClick={loadSafety}
          >
            Try again
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <div className="safety-content">
          {data.fallback && (
            <div className="info-card">
              This guidance is currently shown in English.
            </div>
          )}

          {data.action?.message && (
            <div className="safety-alert">
              <span className="safety-alert-icon">!</span>
              <p>{data.action.message}</p>
            </div>
          )}

          <section className="safety-guidance">
            <span className="date-line">WARNING SIGNS</span>
            <h2>Please seek medical care if you notice these.</h2>

            <div className="safety-list">
              {data.guidance?.map((guidance) => (
                <article
                  className="safety-card"
                  key={guidance.id}
                >
                  <div className="safety-card-header">
                    <span>•</span>

                    {guidance.verified === false && (
                      <span className="draft-label">
                        Draft
                      </span>
                    )}
                  </div>

                  <p>{guidance.text}</p>

                  {guidance.source_citation && (
                    <small>
                      {guidance.source_citation}
                    </small>
                  )}
                </article>
              ))}
            </div>
          </section>

          <div className="safety-footer">
            <strong>You don't have to figure this out alone.</strong>
            <p>
              If you're worried about how you're feeling,
              consider speaking with a healthcare professional.
            </p>

            <button
              className="pixel-button secondary"
              onClick={() => onNavigate("care")}
            >
              Find a professional
            </button>
          </div>
        </div>
      )}
    </MotherShell>
  );
}

function AshaDashboard({ onNavigate }) {
  return (
    <div className="asha-shell">
      <header className="asha-header">
        <PixelLogo />
        <div>
          <span>ASHA WORKER</span>
          <strong>Meena Kumari</strong>
        </div>
      </header>

      <main className="asha-main">
        <div className="page-heading">
          <span className="date-line">MONDAY · 28 SEPTEMBER</span>
          <h1>Good morning, Meena.</h1>
          <p>Here is what needs your attention today.</p>
        </div>

        <div className="asha-stats">
          <div>
            <span>12</span>
            <small>ACTIVE MOTHERS</small>
          </div>
          <div>
            <span>03</span>
            <small>VISITS TODAY</small>
          </div>
          <div>
            <span>01</span>
            <small>NEEDS FOLLOW-UP</small>
          </div>
        </div>

        <section className="queue-section">
          <div className="section-heading">
            <div>
              <span>YOUR QUEUE</span>
              <h2>Today's visits</h2>
            </div>
            <button onClick={() => onNavigate("enrol")}>+ Enrol mother</button>
          </div>

          {[
            ["01", "Lakshmi Devi", "Week 7 · routine follow-up", "10:00 AM", "green"],
            ["02", "Anitha R.", "Week 3 · wellness check", "11:30 AM", "yellow"],
            ["03", "Shobha K.", "Needs follow-up", "02:00 PM", "peach"],
          ].map(([number, name, info, time, tone]) => (
            <div className="queue-row" key={number}>
              <span className="queue-number">{number}</span>
              <div className="queue-person">
                <div className={`queue-avatar ${tone}`}>
                  {name.charAt(0)}
                </div>
                <div>
                  <strong>{name}</strong>
                  <span>{info}</span>
                </div>
              </div>
              <time>{time}</time>
              <button>Open →</button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function Enrol({ onNavigate }) {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <PixelLogo />
        <button onClick={() => onNavigate("asha")}>← Back to dashboard</button>
      </header>

      <main className="enrol-main">
        <span className="date-line">NEW ENROLMENT</span>
        <h1>Begin a mother's care journey.</h1>
        <p>Capture only what is needed to connect her with care.</p>

        <section className="enrol-form">
          <div className="form-row">
            <label>
              Mother's name
              <input placeholder="Full name" />
            </label>

            <label>
              Phone number
              <input placeholder="+91 XXXXX XXXXX" />
            </label>
          </div>

          <div className="form-row">
            <label>
              Date of birth
              <input type="date" />
            </label>

            <label>
              Delivery date
              <input type="date" />
            </label>
          </div>

          <label>
            Notes
            <textarea placeholder="Anything important to remember..." />
          </label>

          <PixelButton onClick={() => onNavigate("asha")}>
            Enrol mother
          </PixelButton>
        </section>
      </main>
    </div>
  );
}

function About({ onNavigate }) {
  return (
    <main className="about-page">
      <Nav onNavigate={onNavigate} />

      <section className="about-hero">
        <span className="date-line">ABOUT PUNARNAVA</span>
        <h1>
          Care should feel
          <br />
          <em>closer.</em>
        </h1>
        <p>
          PUNARNAVA is a postpartum healthcare platform designed around the
          real journey of a mother — connecting her with community health
          workers and healthcare providers when it matters.
        </p>
      </section>

      <div className="about-grid">
        <div>
          <span>01</span>
          <h2>For mothers</h2>
          <p>Simple guidance, wellness check-ins, safety information and a private journal.</p>
        </div>

        <div>
          <span>02</span>
          <h2>For ASHA workers</h2>
          <p>A clearer way to follow mothers, record visits and notice when someone needs support.</p>
        </div>

        <div>
          <span>03</span>
          <h2>For clinics</h2>
          <p>Structured handoffs that help important information travel with the patient.</p>
        </div>
      </div>
    </main>
  );
}

function App() {
  const [page, setPage] = useState("home");

  if (page === "home") return <Landing onNavigate={setPage} />;
  if (page === "login") return <Login onNavigate={setPage} />;
  if (page === "signup") return <Signup onNavigate={setPage} />;
  if (page === "mother") return <MotherHome onNavigate={setPage} />;
  if (page === "journey") return <Journey onNavigate={setPage} />;
  if (page === "care") return <Wellness onNavigate={setPage} />;
  if (page === "journal") return <Journal onNavigate={setPage} />;
  if (page === "safety") return <Safety onNavigate={setPage} />;
  if (page === "asha") return <AshaDashboard onNavigate={setPage} />;
  if (page === "enrol") return <Enrol onNavigate={setPage} />;
  if (page === "about") return <About onNavigate={setPage} />;

  return <Landing onNavigate={setPage} />;
}

export default App;
