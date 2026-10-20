// App.jsx - route table. Add new routes here (see FRONTEND_GUIDE.md rule #5:
// also add the route to docs/SITEMAP.md so it's tracked in one place).
// BrowserRouter lives here because main.jsx has no router.

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";

import Timeline from "./routes/mother/Timeline";
import Enrol from "./routes/mother/Enrol";
import Wellness from "./routes/mother/Wellness";
import Diet from "./routes/mother/Diet";
import Move from "./routes/mother/Move";
import Family from "./routes/mother/Family";
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
import FamilyView from "./routes/family/FamilyView";
import Signup from "./routes/public/Signup";
import PublicPage from "./routes/public/PublicPage";
import Login from "./routes/public/Login";
import Stub from "./components/Stub";
import RoleGuard from "./components/RoleGuard";
import Brand from "./components/Brand";
import Button from "./components/Button";
import Icon from "./components/Icon";
import PixelArt from "./components/PixelArt";
import { getSession, clearSession, homeFor } from "./lib/session";
import useOfflineSync from "./hooks/useOfflineSync";

export default function App() {
  useOfflineSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/how-it-works" element={<PublicPage page="how-it-works" />} />
        <Route path="/principles" element={<PublicPage page="principles" />} />
        <Route path="/privacy" element={<PublicPage page="privacy" />} />

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
        <Route
          path="/m/family"
          element={
            <RoleGuard allowedRoles={["mother"]}>
              <Family />
            </RoleGuard>
          }
        />
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
            <RoleGuard allowedRoles={["doctor", "clinic"]}>
              <DoctorDashboard />
            </RoleGuard>
          }
        />

        <Route
          path="/d/mother/:uid"
          element={
            <RoleGuard allowedRoles={["doctor", "clinic"]}>
              <MotherRecord />
            </RoleGuard>
          }
        />

        {/* No RoleGuard: this is a shared link, same pattern as /c/handoff/:id and
            /s/:token. The husband never logs in -- the grant_id in the URL IS his
            access, and it works only while the mother has not revoked it. */}
        <Route path="/f/:grantId" element={<FamilyView />} />

        <Route path="/c/handoff/:id" element={<Handoff />} />
        <Route path="/c/recall" element={<Stub title="Recall campaign" note="J5 - v1" />} />
        <Route path="/s/:token" element={<Handoff />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  const { token, role, linkedId } = getSession();
  const nav = useNavigate();

  useEffect(() => {
    if (token && role) {
      nav(homeFor(role, linkedId), { replace: true });
    } else {
      nav("/login", { replace: true });
    }
  }, [token, role, linkedId, nav]);

  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="eyebrow">Opening Punarnava…</p>
    </main>
  );
}