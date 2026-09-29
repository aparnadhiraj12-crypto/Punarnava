// App.jsx - route table. Add new routes here (see FRONTEND_GUIDE.md rule #5:
// also add the route to docs/SITEMAP.md so it's tracked in one place).
// BrowserRouter lives here because main.jsx has no router.

import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Timeline from "./routes/mother/Timeline";
import Enrol from "./routes/mother/Enrol";
import Wellness from "./routes/mother/Wellness";
import Journal from "./routes/mother/Journal";
import DangerSigns from "./routes/mother/DangerSigns";
import Queue from "./routes/asha/Queue";
import Handoff from "./routes/clinic/Handoff";
import Signup from "./routes/public/Signup";
import Login from "./routes/public/Login";
import Stub from "./components/Stub";
import PixelScene from "./components/PixelScene";
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

        <Route path="/m/enrol" element={<Enrol />} />
        <Route path="/m/wellness" element={<Wellness />} />
        <Route path="/m/journal" element={<Journal />} />
        <Route path="/m/help" element={<DangerSigns />} />
        <Route path="/m" element={<Timeline />} />
        <Route path="/m/:id" element={<Timeline />} />
        <Route path="/m/item/:id" element={<Stub title="Milestone detail" />} />
        <Route path="/m/family" element={<Stub title="Family mode" note="FR-D8 - separate, revocable, visibly narrower scope" />} />
        <Route path="/m/consent" element={<Stub title="Consent" note="FR-G1..G4" />} />

        <Route path="/a" element={<Queue />} />
        <Route path="/a/mother/:id" element={<Stub title="ASHA - mother detail" />} />
        <Route path="/a/mother/:id/visit" element={<Stub title="Record visit" />} />

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
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="h-48 sm:h-64 border-b-2 border-ink/80">
        <PixelScene />
      </div>
      <main className="flex-1 flex flex-col items-center px-6 pt-8 pb-10 text-center">
        <h1 className="text-3xl text-forest">PUNARNAVA</h1>
        <p className="text-earth mt-2 max-w-xs">A health record that never closes.</p>

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link to="/m" className="pixel-btn-primary">Mother view</Link>
          <Link to="/a" className="pixel-btn-secondary">ASHA view</Link>
        </div>

        <div className="mt-6 text-sm text-ink">
          {loggedIn ? (
            <p>
              Signed in as <strong>{name || "you"}</strong>.{" "}
              <Link to={homeFor(role, linkedId)} className="underline">Go to my page</Link>{" "}
              or{" "}
              <button
                className="underline"
                onClick={() => { clearSession(); window.location.reload(); }}
              >
                log out
              </button>
            </p>
          ) : (
            <p>
              <Link to="/login" className="underline">Log in</Link>
              {" or "}
              <Link to="/signup" className="underline">sign up</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
