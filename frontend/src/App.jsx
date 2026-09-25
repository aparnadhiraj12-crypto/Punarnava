import { Routes, Route, Link } from "react-router-dom";
import MotherTimeline from "./routes/mother/Timeline";
import AshaQueue from "./routes/asha/Queue";
import Handoff from "./routes/clinic/Handoff";
import Stub from "./components/Stub";

/**
 * Route table mirrors docs/SITEMAP.md. Two routes below are real UI
 * (mother timeline, ASHA queue) per the current build priority. Everything
 * else is a labelled stub so the app is navigable end to end for a demo
 * walkthrough even before each screen has real design time.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/how-it-works" element={<Stub title="How it works" />} />
      <Route path="/principles" element={<Stub title="Principles" />} />
      <Route path="/privacy" element={<Stub title="Privacy" />} />

      <Route path="/m/enrol" element={<Stub title="Mother enrolment" note="J1 — manual entry / document capture" />} />
      <Route path="/m" element={<MotherTimeline />} />
      <Route path="/m/item/:id" element={<Stub title="Milestone detail" />} />
      <Route path="/m/family" element={<Stub title="Family mode" note="FR-D8 — separate, revocable, visibly narrower scope" />} />
      <Route path="/m/consent" element={<Stub title="Consent" note="FR-G1..G4" />} />

      <Route path="/a" element={<AshaQueue />} />
      <Route path="/a/mother/:id" element={<Stub title="ASHA — mother detail" />} />
      <Route path="/a/mother/:id/visit" element={<Stub title="Record visit" />} />

      <Route path="/c/handoff/:id" element={<Handoff />} />
      <Route path="/c/recall" element={<Stub title="Recall campaign" note="J5 — v1" />} />
      <Route path="/s/:token" element={<Handoff />} />
    </Routes>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-clay-50 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-plum-700">PUNARNAVA</h1>
      <p className="text-clay-700 mt-2 max-w-xs">A health record that never closes.</p>
      <div className="flex gap-3 mt-8">
        <Link to="/m" className="px-4 py-2 rounded-lg bg-plum-500 text-white text-sm">Mother view</Link>
        <Link to="/a" className="px-4 py-2 rounded-lg bg-clay-100 text-clay-700 text-sm">ASHA view</Link>
      </div>
    </div>
  );
}
