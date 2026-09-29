import React, { useState } from "react";
import {
  login,
  signup,
  getMe,
} from "./lib/api";
import { saveSession } from "./lib/session";

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
    <div className="landscape" aria-hidden="true">
      <div className="sun" />

      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />

      <div className="mountain mountain-back" />
      <div className="mountain mountain-front" />

      <div className="tree tree-one">
        <div className="tree-top" />
        <div className="tree-trunk" />
      </div>

      <div className="tree tree-two">
        <div className="tree-top" />
        <div className="tree-trunk" />
      </div>

      <div className="house">
        <div className="roof" />
        <div className="house-body">
          <div className="window" />
          <div className="door" />
        </div>
      </div>

      <div className="grass grass-one" />
      <div className="grass grass-two" />
      <div className="flowers">
        <i>✿</i>
        <i>✿</i>
        <i>✿</i>
        <i>✿</i>
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

  return (
    <main className="auth-page">
      <div className="auth-art">
        <Landscape />
        <div className="auth-message">
          <PixelLogo />
          <h1>A new chapter.</h1>
          <p>Let's make the journey a little gentler.</p>
        </div>
      </div>

      <div className="auth-panel">
        <button className="back-button" onClick={() => onNavigate("home")}>
          ← Back home
        </button>

        <div className="form-wrap">
          <span className="form-kicker">GET STARTED</span>
          <h2>Create your account</h2>
          <p className="form-description">
            Tell us a little about yourself.
          </p>

          <div className="role-selector">
            <button
              className={role === "mother" ? "active" : ""}
              onClick={() => setRole("mother")}
            >
              Mother
            </button>

            <button
              className={role === "asha" ? "active" : ""}
              onClick={() => setRole("asha")}
            >
              ASHA worker
            </button>
          </div>

          <label>
            Your name
            <input type="text" placeholder="Enter your name" />
          </label>

          <label>
            Phone number
            <input type="tel" placeholder="+91 XXXXX XXXXX" />
          </label>

          <label>
            Password
            <input type="password" placeholder="Create a password" />
          </label>

          <PixelButton onClick={() => onNavigate(role === "mother" ? "mother" : "asha")}>
            Create account
          </PixelButton>

          <p className="bottom-link">
            Already have an account?{" "}
            <button onClick={() => onNavigate("login")}>Sign in</button>
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
        const result = await getMe();

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
  const milestones = [
    ["01", "The first days", "Rest, recovery and getting to know each other.", true],
    ["02", "Finding your rhythm", "Small routines begin to settle in.", true],
    ["03", "Where you are now", "Week 7 · checking in with yourself.", true],
    ["04", "Looking ahead", "Your next milestone is approaching.", false],
  ];

  return (
    <MotherShell page="journey" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">YOUR CARE STORY</span>
        <h1>The journey so far.</h1>
        <p>There is no perfect timeline. Just yours.</p>
      </div>

      <div className="timeline">
        {milestones.map(([number, title, text, done], index) => (
          <div className={`timeline-item ${done ? "done" : ""}`} key={number}>
            <div className="timeline-marker">
              <span>{done ? "✓" : number}</span>
            </div>

            <div className="timeline-content">
              <span>CHAPTER {number}</span>
              <h2>{title}</h2>
              <p>{text}</p>

              {index === 2 && (
                <div className="timeline-note">
                  <span>✦</span>
                  Today's gentle reminder: drink some water and rest when you can.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </MotherShell>
  );
}

function Wellness({ onNavigate }) {
  const [selected, setSelected] = useState(null);

  const feelings = [
    ["🌤", "Okay", "I'm doing alright today."],
    ["🌥", "A little tired", "I need some extra rest."],
    ["🌧", "Not great", "Something feels difficult today."],
    ["🌙", "I need help", "I'd like someone to check in."],
  ];

  return (
    <MotherShell page="care" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">WELLNESS CHECK-IN</span>
        <h1>How are you, really?</h1>
        <p>You can be honest here. There is no right answer.</p>
      </div>

      <section className="wellness-panel">
        <div className="wellness-question">
          <span className="question-number">01</span>
          <h2>How are you feeling today?</h2>
        </div>

        <div className="feeling-grid">
          {feelings.map(([icon, title, text], index) => (
            <button
              key={title}
              className={selected === index ? "feeling selected" : "feeling"}
              onClick={() => setSelected(index)}
            >
              <span>{icon}</span>
              <strong>{title}</strong>
              <small>{text}</small>
            </button>
          ))}
        </div>

        {selected !== null && (
          <div className="wellness-response">
            <span>✿</span>
            <div>
              <strong>Thank you for checking in.</strong>
              <p>
                Being aware of how you feel is already an important part of
                caring for yourself.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="resource-row">
        <div>
          <span>REST</span>
          <strong>Your body has done something extraordinary.</strong>
          <p>Give yourself permission to move slowly.</p>
        </div>

        <div>
          <span>HYDRATION</span>
          <strong>Keep water close today.</strong>
          <p>Small sips throughout the day are enough.</p>
        </div>

        <div>
          <span>CONNECTION</span>
          <strong>You don't have to carry it alone.</strong>
          <p>Reach out when you need someone.</p>
        </div>
      </div>
    </MotherShell>
  );
}

function Journal({ onNavigate }) {
  const [text, setText] = useState("");

  return (
    <MotherShell page="journal" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">PRIVATE JOURNAL</span>
        <h1>A little space for you.</h1>
        <p>Write whatever you need. This space is yours.</p>
      </div>

      <section className="journal-paper">
        <div className="paper-top">
          <span>28 · SEPTEMBER · 2026</span>
          <span>✦ PRIVATE</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Today I feel..."
        />

        <div className="paper-bottom">
          <span>{text.length} characters</span>
          <PixelButton variant="small">Save entry</PixelButton>
        </div>
      </section>

      <div className="past-entry">
        <span>YESTERDAY</span>
        <p>
          “Today felt a little easier. I went outside for ten minutes and it
          helped.”
        </p>
      </div>
    </MotherShell>
  );
}

function Safety({ onNavigate }) {
  return (
    <MotherShell page="safety" onNavigate={onNavigate}>
      <div className="page-heading">
        <span className="date-line">SAFETY & SUPPORT</span>
        <h1>When something doesn't feel right.</h1>
        <p>
          Knowing the warning signs can help you get the right care at the
          right time.
        </p>
      </div>

      <section className="safety-banner">
        <div className="safety-symbol">!</div>
        <div>
          <strong>If you feel unsafe or seriously unwell</strong>
          <p>Contact a healthcare professional or emergency service immediately.</p>
        </div>
      </section>

      <div className="danger-grid">
        {[
          ["Heavy bleeding", "Bleeding that is suddenly much heavier than expected."],
          ["High fever", "A fever with chills, weakness or feeling very unwell."],
          ["Severe pain", "Pain that is intense, worsening or difficult to manage."],
          ["Breathing trouble", "Sudden difficulty breathing or chest discomfort."],
          ["Severe headache", "A strong headache, especially with vision changes."],
          ["Feeling very low", "Persistent sadness, fear or thoughts of harming yourself or someone else."],
        ].map(([title, text]) => (
          <div className="danger-card" key={title}>
            <div className="danger-mark">!</div>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="contact-card" onClick={() => onNavigate("journey")}>
        <div>
          <span>NEED SOMEONE?</span>
          <h3>Talk to your ASHA worker</h3>
          <p>Meena can help connect you with the right care.</p>
        </div>
        <strong>→</strong>
      </button>
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
