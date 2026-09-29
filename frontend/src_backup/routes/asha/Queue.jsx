// /a - ASHA queue. The ONLY order is the backend's (most days overdue first).
// No sort dropdown, no severity labels, clinical events are plain tags.
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listWomen, recordVisit } from "../../lib/api";
import PixelAvatar from "../../components/PixelAvatar";
import StatusStamp from "../../components/StatusStamp";
import CouldNotGoReasons from "../../components/CouldNotGoReasons";
import { eventLabel } from "../../lib/labels";
import { Loading, Unreachable } from "../../components/Page";

function StatusBadge({ online }) {
  return (
    <span className="pixel-badge bg-cream text-ink">{online ? "Online" : "Offline"}</span>
  );
}

export default function Queue() {
  const [women, setWomen] = useState(null);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  // Two-tap: tap 1 picks the outcome (pending), tap 2 confirms or picks a reason.
  const [pending, setPending] = useState(null); // { id, outcome }
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    listWomen().then((r) => setWomen(Array.isArray(r) ? r : r.women ?? [])).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const recordTwoTap = (m, outcome) => setPending({ id: m.id, outcome });

  async function confirm(m, outcome, reason) {
    setSaveError(false);
    try {
      await recordVisit(m.id, outcome, reason); // no rule_id: most overdue milestone
      setPending(null);
      load();
    } catch {
      setSaveError(true);
    }
  }

  return (
    <div className="min-h-screen bg-paper pixel-dither">
      <main className="mx-auto max-w-xl px-4 pt-5 pb-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-earth underline">Home</Link>
          <StatusBadge online={online} />
        </div>
        <h1 className="text-2xl text-forest mt-2">Mothers to visit</h1>
        <p className="text-sm text-earth mb-4">Most days overdue first.</p>

        {failed && <Unreachable onRetry={load} />}
        {!failed && !women && <Loading />}
        {saveError && <p role="alert" className="text-clay mb-3">Could not save. Try again.</p>}
        {women?.length === 0 && (
          <p className="pixel-card">No mothers yet. <Link to="/m/enrol" className="underline">Enrol one</Link>.</p>
        )}

        <ul className="flex flex-col gap-4">
          {women?.map((m) => {
            const isPending = pending?.id === m.id;
            return (
              <li key={m.id} className={m.max_days_overdue > 0 ? "pixel-card-overdue" : "pixel-card-completed"}>
                <div className="flex items-center gap-3">
                  <PixelAvatar name={m.name} />
                  <div className="flex-1">
                    <p className="text-lg font-display text-forest">{m.name}</p>
                    <p className="text-sm text-earth">Day {m.postpartum_day} after delivery</p>
                  </div>
                  {m.max_days_overdue > 0
                    ? <StatusStamp status="overdue">{m.max_days_overdue} days overdue</StatusStamp>
                    : <StatusStamp status="completed">Up to date</StatusStamp>}
                </div>

                {m.clinical_events?.length > 0 && (
                  <ul className="flex flex-wrap gap-2 mt-3">
                    {m.clinical_events.map((e, i) => (
                      <li key={`${e.type}-${i}`} className="pixel-badge bg-cream text-ink">{eventLabel(e.type)}</li>
                    ))}
                  </ul>
                )}

                {!isPending && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button className="pixel-btn-primary" onClick={() => recordTwoTap(m, "done")}>Done</button>
                    <button className="pixel-btn-secondary" onClick={() => recordTwoTap(m, "could_not_go")}>Could not go</button>
                    <Link to={`/m/${m.id}`} className="pixel-btn-ghost">View timeline</Link>
                  </div>
                )}

                {isPending && pending.outcome === "done" && (
                  <div className="mt-3">
                    <p className="text-sm mb-2">Mark the most overdue visit as done?</p>
                    <div className="flex gap-2">
                      <button className="pixel-btn-primary" onClick={() => confirm(m, "done")}>Yes, done</button>
                      <button className="pixel-btn-ghost" onClick={() => setPending(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {isPending && pending.outcome === "could_not_go" && (
                  <div className="mt-3">
                    <p className="text-sm mb-2">Why could she not go?</p>
                    <CouldNotGoReasons onSelect={(reason) => confirm(m, "could_not_go", reason)} />
                    <button className="text-sm underline mt-2" onClick={() => setPending(null)}>Cancel</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
