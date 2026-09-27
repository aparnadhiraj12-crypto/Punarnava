// routes/mother/Timeline.jsx
// Nav, hero-with-illustration slot, risk flags, vine-style vertical timeline --
// all driven by the live record (GET /api/record/women/:id), not fixtures.
// Defaults to the seeded demo mother so /m keeps working with no id.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getWoman } from "../../lib/api";
import PixelIcon from "../../components/PixelIcon";
import PixelScene from "../../components/PixelScene";
import StatusStamp from "../../components/StatusStamp";
import { milestoneLabel, eventLabel, stateLabel, stateStampStatus } from "../../lib/labels";

const DEFAULT_ID = "demo-lakshmi";

function Nav() {
  return (
    <nav className="bg-forest text-cream flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-2 font-display font-semibold">
        <PixelIcon name="home" size={20} />
        PUNARNAVA
      </div>
      <div className="flex items-center gap-6 text-sm">
        <a href="/m" className="underline underline-offset-4">Mother</a>
        <a href="/a">ASHA Queue</a>
        <a href="/c/handoff/demo-lakshmi">Clinic / Handoff</a>
      </div>
    </nav>
  );
}

export default function Timeline() {
  const { id } = useParams();
  const womanId = id || DEFAULT_ID;
  const [woman, setWoman] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setWoman(null);
    setError(false);
    getWoman(womanId).then(setWoman).catch(() => setError(true));
  }, [womanId]);

  return (
    <main className="bg-paper min-h-screen">
      <Nav />

      {/* Hero -- PixelScene is a code-drawn placeholder illustration.
          min-h (not a fixed h-64) so it grows with the card instead of
          the card overflowing upward through the nav when content is tall. */}
      <div className="relative min-h-[16rem] flex items-end p-6">
        <PixelScene className="absolute inset-0" />
        {woman && (
          <div className="relative pixel-card max-w-sm bg-cream/95 my-4">
            <p className="text-sm text-earth mb-1">Postpartum care journey</p>
            <h1 className="text-2xl mb-3">{woman.name}</h1>
            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
              <div>
                <PixelIcon name="calendar" size={16} className="mb-1 text-clay" />
                <p className="text-earth">Delivery date</p>
                <p className="font-medium">{woman.delivery_date}</p>
              </div>
              <div>
                <p className="text-earth mb-1">Mode</p>
                <p className="font-medium">{woman.mode_of_delivery ?? "--"}</p>
              </div>
              <div>
                <p className="text-earth mb-1">Days postpartum</p>
                <p className="font-medium">{woman.postpartum_day}</p>
              </div>
            </div>
            {woman.clinical_events?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {woman.clinical_events.map((e) => (
                  <StatusStamp key={e.type} status="risk">{eventLabel(e.type)}</StatusStamp>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <section className="max-w-lg mx-auto px-6 py-10">
        <h2 className="text-xl mb-6">Timeline</h2>

        {error && (
          <p className="pixel-badge-overdue mb-4">
            <PixelIcon name="overdue" size={14} /> Couldn't reach the backend
          </p>
        )}
        {!error && !woman && <p className="text-earth">Loading...</p>}

        {woman && (
          <ol className="relative">
            {woman.milestones.map((m, i) => (
              <li key={m.rule_id} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full bg-forest border-2 border-cream shadow-pixel" />
                  {i < woman.milestones.length - 1 && <div className="pixel-vine flex-1 mt-1" />}
                </div>
                <div className="pb-1">
                  <p className="font-medium">{milestoneLabel(m.type)}</p>
                  <StatusStamp status={stateStampStatus(m.state)}>
                    {`${stateLabel(m.state)} - ${m.due_date}${m.state === "missed" ? ` - ${m.days_overdue} days overdue` : ""}`}
                  </StatusStamp>
                  {/* NFR-25: every milestone traceable to the rule + citation that produced it */}
                  <p className="text-xs text-earth mt-1">{m.citation}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
