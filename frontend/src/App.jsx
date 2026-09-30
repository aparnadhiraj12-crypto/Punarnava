// App.jsx - route table. Add new routes here (see FRONTEND_GUIDE.md rule #5:
// also add the route to docs/SITEMAP.md so it's tracked in one place).
// BrowserRouter lives here because main.jsx has no router.

import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Timeline from "./routes/mother/Timeline";
import Enrol from "./routes/mother/Enrol";
import Wellness from "./routes/mother/Wellness";
import Diet from "./routes/mother/Diet";
import Move from "./routes/mother/Move";
import Journal from "./routes/mother/Journal";
import Mind from "./routes/mother/mind/Mind";
import Support from "./routes/mother/mind/Support";
import DangerSigns from "./routes/mother/DangerSigns";
import Queue from "./routes/asha/Queue";
import MotherDetail from "./routes/asha/MotherDetail";
import VisitLog from "./routes/asha/VisitLog";
import DoctorDashboard from "./routes/doctor/Dashboard";
import MotherRecord from "./routes/doctor/MotherRecord";
import Handoff from "./routes/clinic/Handoff";
import Signup from "./routes/public/Signup";
import Login from "./routes/public/Login";
import Stub from "./components/Stub";
import RoleGuard from "./components/RoleGuard";
import Brand from "./components/Brand";
import Button from "./components/Button";
import Icon from "./components/Icon";
import PixelArt from "./components/PixelArt";
import { getSession, clearSession, homeFor } from "./lib/session";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/how-it-works" element={<Stub title="How it works" />} />
        <Route path="/principles" element={<Stub title="Principles" />} />
        <Route path="/privacy" element={<Stub title="Privacy" />} />

        <Route
          path="/m/enrol"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Enrol />
            </RoleGuard>
          }
        />
        <Route
          path="/a/enrol"
          element={
            <RoleGuard allowedRoles={["asha"]}>
              <Enrol />
            </RoleGuard>
          }
        />
        <Route
          path="/m/wellness"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Wellness />
            </RoleGuard>
          }
        />

        <Route
          path="/m/diet"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Diet />
            </RoleGuard>
          }
        />
        <Route
          path="/m/move"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Move />
            </RoleGuard>
          }
        />

        <Route
          path="/m/journal"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Journal />
            </RoleGuard>
          }
        />

        <Route
          path="/m/mind"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Mind />
            </RoleGuard>
          }
        />

        <Route
          path="/m/mind/journal"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Journal />
            </RoleGuard>
          }
        />

        <Route
          path="/m/mind/support"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Support />
            </RoleGuard>
          }
        />
        <Route
          path="/m/help"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <DangerSigns />
            </RoleGuard>
          }
        />
        <Route
          path="/m"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Timeline />
            </RoleGuard>
          }
        />
        <Route
          path="/m/:id"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Timeline />
            </RoleGuard>
          }
        />
        <Route path="/m/item/:id" element={<Stub title="Milestone detail" />} />
        <Route path="/m/family" element={<Stub title="Family mode" note="FR-D8 - separate, revocable, visibly narrower scope" />} />
        <Route path="/m/consent" element={<Stub title="Consent" note="FR-G1..G4" />} />

        <Route
          path="/a"
          element={
            <RoleGuard allowedRoles={["asha"]}>
              <Queue />
            </RoleGuard>
          }
        />
        <Route
          path="/a/mother/:id"
          element={
            <RoleGuard allowedRoles={["asha"]}>
              <MotherDetail />
            </RoleGuard>
          }
        />
        <Route
          path="/a/mother/:id/visit"
          element={
            <RoleGuard allowedRoles={["asha"]}>
              <VisitLog />
            </RoleGuard>
          }
        />

        <Route
          path="/d"
          element={
            <RoleGuard allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </RoleGuard>
          }
        />

        <Route
          path="/d/mother/:uid"
          element={
            <RoleGuard allowedRoles={["doctor"]}>
              <MotherRecord />
            </RoleGuard>
          }
        />

        <Route
          path="/f"
          element={
            <RoleGuard allowedRoles={["family"]}>
              <Stub
                title="Family view"
                note="Family sharing will be implemented later."
              />
            </RoleGuard>
          }
        />

        <Route path="/c/handoff/:id" element={<Handoff />} />
        <Route path="/c/recall" element={<Stub title="Recall campaign" note="J5 - v1" />} />
        <Route path="/s/:token" element={<Handoff />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  // Reading storage on render is fine here; logout just reloads the page.
  const { token, role, linkedId, name } = getSession();
  const loggedIn = Boolean(token);

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Brand />
        <div className="nav-actions">
          {loggedIn ? (
            <>
              <span className="section-note" style={{ margin: 0 }}>Signed in as <strong>{name || "you"}</strong></span>
              <Link to={homeFor(role, linkedId)}><Button>Go to my page</Button></Link>
              <Button tone="quiet" onClick={() => { clearSession(); window.location.reload(); }}>Log out</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button tone="quiet">Log in</Button></Link>
              <Link to="/signup"><Button>Create account</Button></Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="badge">Postpartum care, connected</span>
          <div className="display display-xl">Your health journey<br />doesn't end here.</div>
          <p className="lead">Punarnava keeps your postpartum care connected — from one visit to the next.</p>
          <div className="button-row">
            <Link to="/m"><Button>Mother view <Icon name="arrow" /></Button></Link>
            <Link to="/a"><Button tone="secondary">ASHA view</Button></Link>
          </div>
          <div className="trust-line">
            <Icon name="shield" />
            <span>Private, simple and made for continuity of care</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="sun-stamp" />
          <PixelArt kind="mother" />
          <div className="art-caption">
            <span>A record that grows with you</span>
            <Icon name="leaf" />
          </div>
        </div>
      </section>

      <section className="features">
        {[
          ["01", "Continuous care", "Your milestones stay connected."],
          ["02", "For every step", "See what is due, what is done, and what comes next."],
          ["03", "Built for real care", "Designed around mothers, ASHA workers and clinics."],
        ].map(([n, title, copy]) => (
          <article className="feature-card" key={n}>
            <span className="pixel-label">{n}</span>
            <div className="feature-title">{title}</div>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="care-flow" id="how">
        <div>
          <div className="eyebrow">One continuous record</div>
          <div className="display display-lg">Care moves with you.</div>
          <p>Every visit adds to the same clear journey, so the people supporting you can understand what has happened and what comes next.</p>
        </div>
        <div className="flow-steps">
          <div className="flow-person"><PixelArt kind="mother" /><strong>Mother</strong><span>Sees her journey</span></div>
          <Icon name="arrow" size={26} />
          <div className="flow-person"><PixelArt kind="worker" /><strong>ASHA</strong><span>Records each visit</span></div>
          <Icon name="arrow" size={26} />
          <div className="flow-person"><PixelArt kind="clinic" /><strong>Clinic</strong><span>Receives a clear handoff</span></div>
        </div>
      </section>

      <footer>
        <Brand />
        <span>Made for every step after birth.</span>
        <div className="footer-links">
          <Link to="/how-it-works">How it works</Link>
          <Link to="/principles">Principles</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
