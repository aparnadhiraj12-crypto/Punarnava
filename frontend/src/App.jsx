// App.jsx — route table. Add new routes here (see FRONTEND_GUIDE.md rule #5:
// also add the route to docs/SITEMAP.md so it's tracked in one place).

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Timeline from "./routes/mother/Timeline";
import Enrol from "./routes/mother/Enrol";
import Queue from "./routes/asha/Queue";
import Handoff from "./routes/clinic/Handoff";
import Stub from "./components/Stub";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* [checked] built */}
        <Route path="/m" element={<Timeline />} />
        <Route path="/m/enrol" element={<Enrol />} />
        <Route path="/m/:id" element={<Timeline />} />
        <Route path="/a" element={<Queue />} />
        <Route path="/c/handoff/:id" element={<Handoff />} />
        <Route path="/s/:token" element={<Handoff />} />

        {/* [not built yet] Stub placeholders */}
        <Route path="/m/family" element={<Stub />} />
        <Route path="/m/consent" element={<Stub />} />
        <Route path="/c/recall" element={<Stub />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/m" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
