// routes/asha/Queue.jsx
import { useEffect, useState } from "react";
import { getWomen } from "../../lib/api";
import PixelIcon from "../../components/PixelIcon";
import PixelAvatar from "../../components/PixelAvatar";
import PixelScene from "../../components/PixelScene";
import StatusStamp from "../../components/StatusStamp";

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
        <a href="/c/handoff">Clinic / Handoff</a>
      </div>
    </nav>
  );
}

export default function Queue() {
  const [women, setWomen] = useState([]);
  const [sort, setSort] = useState("overdue");
  const [error, setError] = useState(false);

  useEffect(() => {
    getWomen()
      .then(setWomen)
      .catch(() => setError(true));
  }, []);

  const sorted = [...women].sort((a, b) => (b.days_overdue ?? 0) - (a.days_overdue ?? 0));
  const needAttention = sorted.filter((w) => (w.days_overdue ?? 0) > 0).length;

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
        <div className="flex items-center gap-2 mb-5 text-sm">
          <span className="text-earth">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="pixel-frame border-2 border-ink/60 bg-cream px-2 py-1"
            style={{ "--notch": "3px" }}
          >
            <option value="overdue">Days overdue</option>
            <option value="postpartum">Days postpartum</option>
          </select>
        </div>

        {error && (
          <p className="pixel-badge-overdue mb-4">
            <PixelIcon name="overdue" size={14} /> Couldn't reach the backend
          </p>
        )}

        <div className="flex flex-col gap-4">
          {sorted.map((w) => {
            const status = w.days_overdue > 0 ? "overdue" : w.due_soon ? "due" : "upcoming";
            const cardClass =
              status === "overdue" ? "pixel-card-overdue" : status === "due" ? "pixel-card-due" : "pixel-card";
            return (
              <div key={w.id} className={`${cardClass} flex items-start gap-4`}>
                <PixelAvatar name={w.name} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-semibold">{w.name}</p>
                    <StatusStamp status={status}>
                      {status === "overdue"
                        ? `Overdue · ${w.days_overdue} ${w.days_overdue === 1 ? "day" : "days"}`
                        : status === "due"
                        ? "Due soon"
                        : "Upcoming"}
                    </StatusStamp>
                  </div>
                  <p className="text-sm text-earth mb-1">{w.days_postpartum} days postpartum</p>
                  {w.next_milestone && (
                    <p className="text-sm mb-1">Next: {w.next_milestone}</p>
                  )}
                  {w.risk_flags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {w.risk_flags.map((flag) => (
                        <StatusStamp key={flag} status="risk">{flag}</StatusStamp>
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