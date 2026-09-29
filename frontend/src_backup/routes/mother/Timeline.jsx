// /m and /m/:id - one mother's timeline, loaded from the URL (guide section 5).
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getWoman, recordVisit } from "../../lib/api";
import { milestoneLabel, eventLabel, stateCardClass, stateStampStatus } from "../../lib/labels";
import PixelAvatar from "../../components/PixelAvatar";
import StatusStamp from "../../components/StatusStamp";
import CouldNotGoReasons from "../../components/CouldNotGoReasons";
import { Loading, Unreachable } from "../../components/Page";

export default function Timeline() {
  const { id } = useParams();
  const womanId = id ?? localStorage.getItem("punarnava_linked_id") ?? "demo-lakshmi";

  const [woman, setWoman] = useState(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(null); // rule_id currently choosing a reason
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getWoman(womanId).then(setWoman).catch(() => setFailed(true));
  }, [womanId]);
  useEffect(() => { setWoman(null); load(); }, [load]);

  async function record(m, outcome, reason) {
    setSaveError(false);
    try {
      await recordVisit(womanId, outcome, reason, m.rule_id);
      setAsking(null);
      load();
    } catch {
      setSaveError(true);
    }
  }

  if (failed) return <div className="p-4 max-w-xl mx-auto"><Unreachable onRetry={load} /></div>;
  if (!woman) return <div className="p-4 max-w-xl mx-auto"><Loading /></div>;

  return (
    <div className="min-h-screen bg-paper pixel-dither">
      <main className="mx-auto max-w-xl px-4 pt-5 pb-12">
        <Link to="/" className="text-sm text-earth underline">Home</Link>

        <header className="flex items-center gap-3 mt-3">
          <PixelAvatar name={woman.name} size={56} />
          <div>
            <h1 className="text-2xl text-forest">{woman.name}</h1>
            <p className="text-sm text-earth">
              Day {woman.postpartum_day} after delivery · {woman.delivery_date}
              {woman.mode_of_delivery ? ` · ${woman.mode_of_delivery}` : ""}
            </p>
          </div>
        </header>

        {woman.incomplete && (
          <p className="pixel-card mt-3 text-sm">Some details are missing, so this timeline may be incomplete.</p>
        )}

        {/* plain tags: no ranking, no colour intensity */}
        {woman.clinical_events?.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-3">
            {woman.clinical_events.map((e, i) => (
              <li key={`${e.type}-${i}`} className="pixel-badge bg-cream text-ink">{eventLabel(e.type)}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/m/help" className="pixel-btn-primary">Not feeling well?</Link>
          <Link to="/m/wellness" className="pixel-btn-secondary">Wellness</Link>
          <Link to="/m/journal" className="pixel-btn-secondary">Journal</Link>
          <Link to={`/c/handoff/${woman.id}`} className="pixel-btn-ghost">Clinic summary</Link>
        </div>

        {saveError && <p role="alert" className="text-clay mt-3">Could not save. Try again.</p>}

        <ol className="mt-6 flex flex-col gap-4">
          {woman.milestones?.map((m) => {
            const stamp = stateStampStatus(m.state);
            const actionable = m.state === "due" || m.state === "missed";
            return (
              <li key={m.rule_id} className={stateCardClass(m.state)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg text-forest">{milestoneLabel(m.type)}</h2>
                    <p className="text-sm text-earth">Due {m.due_date}</p>
                  </div>
                  {stamp && (
                    <StatusStamp status={stamp}>
                      {m.state === "missed" && m.days_overdue ? `${m.days_overdue} days overdue` : undefined}
                    </StatusStamp>
                  )}
                </div>

                {typeof m.entitlement === "string" && m.entitlement && (
                  <p className="text-sm text-ink mt-2">{m.entitlement}</p>
                )}
                <p className="text-xs text-earth mt-2">{m.citation}</p>

                {actionable && asking !== m.rule_id && (
                  <div className="flex gap-2 mt-3">
                    <button className="pixel-btn-primary" onClick={() => record(m, "done")}>I went</button>
                    <button className="pixel-btn-secondary" onClick={() => setAsking(m.rule_id)}>Could not go</button>
                  </div>
                )}
                {asking === m.rule_id && (
                  <div className="mt-3">
                    <p className="text-sm text-ink mb-2">Why could you not go?</p>
                    <CouldNotGoReasons onSelect={(reason) => record(m, "could_not_go", reason)} />
                    <button className="text-sm underline mt-2" onClick={() => setAsking(null)}>Cancel</button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
