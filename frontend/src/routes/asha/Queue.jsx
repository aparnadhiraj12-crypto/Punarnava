// routes/asha/Queue.jsx
// FR-E1: sorted by days overdue ONLY. No other sort control belongs here --
// see docs/compliance.md rule 1. (An earlier draft had a "sort by days
// postpartum" option; removed, since a second sort key is exactly what the
// compliance audit exists to catch.)
import { useEffect, useState } from "react";
import { getWomen } from "../../lib/api";
import PixelIcon from "../../components/PixelIcon";
import PixelAvatar from "../../components/PixelAvatar";
import PixelScene from "../../components/PixelScene";
import StatusStamp from "../../components/StatusStamp";
import { milestoneLabel, eventLabel, sortByOverdue } from "../../lib/labels";

function Nav() {
  return (
    <nav className="bg-forest text-cream flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-2 font-display font-semibold">
        <PixelIcon name="home" size={20} />
        PUNARNAVA
      </div>
      <div className="flex items-center gap-6 text-sm">
        <a href="/m">Mother</a>
        <a href="/a" className="underline underline-offset-4">ASHA Queue</a>
        <a href="/c/handoff/demo-lakshmi">Clinic / Handoff</a>
      </div>
    </nav>
  );
}

export default function Queue() {
  const [women, setWomen] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    getWomen().then(setWomen).catch(() => setError(true));
  }, []);

  const sorted = [...women].sort((a, b) =>
    sortByOverdue({ days_overdue: a.max_days_overdue }, { days_overdue: b.max_days_overdue })
  );
  const needAttention = sorted.filter((w) => (w.max_days_overdue ?? -1) > 0).length;

  return (
    <main className="bg-paper min-h-screen">
      <Nav />

      <div className="relative h-48">
        <PixelScene className="absolute inset-0" />
        <div className="relative pixel-card bg-cream/95 max-w-sm mx-6 mt-8">
          <h1 className="text-2xl mb-1">Good morning, Anjali</h1>
          <p className="text-sm text-earth mb-3">Your maternal care queue</p>
          <StatusStamp status="overdue">{`${needAttention} mothers need attention`}</StatusStamp>
        </div>
      </div>

      <section className="max-w-2xl mx-auto px-6 py-8">
        <p className="text-sm text-earth mb-5">Sorted by days overdue -- the only order this list ever uses.</p>

        {error && (
          <p className="pixel-badge-overdue mb-4">
            <PixelIcon name="overdue" size={14} /> Couldn't reach the backend
          </p>
        )}

        <div className="flex flex-col gap-4">
          {sorted.map((w) => {
            const overdue = w.max_days_overdue ?? -1;
            const status = overdue > 0 ? "overdue" : overdue === 0 ? "due" : "upcoming";
            const cardClass =
              status === "overdue" ? "pixel-card-overdue" : status === "due" ? "pixel-card-due" : "pixel-card";
            const topMilestone = w.milestones?.[0];
            return (
              <div key={w.id} className={`${cardClass} flex items-start gap-4`}>
                <PixelAvatar name={w.name} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-semibold">{w.name}</p>
                    <StatusStamp status={status}>
                      {status === "overdue"
                        ? `Overdue - ${overdue} ${overdue === 1 ? "day" : "days"}`
                        : status === "due"
                        ? "Due now"
                        : "Upcoming"}
                    </StatusStamp>
                  </div>
                  <p className="text-sm text-earth mb-1">{w.postpartum_day} days postpartum</p>
                  {topMilestone && (
                    <p className="text-sm mb-1">Next: {milestoneLabel(topMilestone.type)}</p>
                  )}
                  {w.clinical_events?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {w.clinical_events.map((e) => (
                        <StatusStamp key={e.type} status="risk">{eventLabel(e.type)}</StatusStamp>
                      ))}
                    </div>
                  )}
                  <a href={`/m/${w.id}`} className="pixel-btn-secondary text-sm">
                    View timeline
                  </a>
                </div>
              </div>
            );
          })}

          {!error && sorted.length === 0 && (
            <div className="pixel-card text-center py-10">
              <PixelIcon name="mother" size={40} className="mx-auto mb-3 text-sage" />
              <p className="font-medium mb-1">No mothers found</p>
              <p className="text-sm text-earth">Try adjusting your filters or check back later.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
