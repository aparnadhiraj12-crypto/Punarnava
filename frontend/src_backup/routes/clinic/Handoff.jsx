// /c/handoff/:id and /s/:token - one-page summary for a receiving clinic.
// Works with no account. Uses the real field names (state, postpartum_day, clinical_events).
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getWoman } from "../../lib/api";
import { milestoneLabel, eventLabel } from "../../lib/labels";
import Page, { Loading, Unreachable } from "../../components/Page";

function Column({ title, list, empty }) {
  return (
    <section className="pixel-card">
      <h2 className="text-lg text-forest mb-2">{title}</h2>
      {list.length === 0 ? <p className="text-sm text-earth">{empty}</p> : (
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.rule_id}>
              <p className="text-ink">{milestoneLabel(m.type)}</p>
              <p className="text-sm text-earth">
                Due {m.due_date}{m.state === "missed" && m.days_overdue ? ` · ${m.days_overdue} days overdue` : ""}
              </p>
              <p className="text-xs text-earth">{m.citation}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Handoff() {
  const { id, token } = useParams();
  const womanId = id ?? token;
  const [woman, setWoman] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getWoman(womanId).then(setWoman).catch(() => setFailed(true));
  }, [womanId]);
  useEffect(() => { setWoman(null); load(); }, [load]);

  const ms = woman?.milestones ?? [];
  const done = ms.filter((m) => m.state === "done");
  const overdue = ms.filter((m) => m.state === "due" || m.state === "missed");
  const upcoming = ms.filter((m) => m.state === "pending");

  return (
    <Page title="Clinic summary" back={id ? `/m/${id}` : "/"} backLabel="Back">
      {failed && <Unreachable onRetry={load} />}
      {!failed && !woman && <Loading />}
      {woman && (
        <div className="space-y-4">
          <div className="pixel-card">
            <p className="text-xl font-display text-forest">{woman.name}</p>
            <p className="text-sm text-earth">
              Day {woman.postpartum_day} after delivery · {woman.delivery_date}
              {woman.mode_of_delivery ? ` · ${woman.mode_of_delivery}` : ""}
            </p>
            {woman.discharge_hb != null && <p className="text-sm text-ink mt-1">Haemoglobin at discharge: {woman.discharge_hb}</p>}
            {woman.clinical_events?.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-2">
                {woman.clinical_events.map((e, i) => (
                  <li key={`${e.type}-${i}`} className="pixel-badge bg-cream text-ink">{eventLabel(e.type)}</li>
                ))}
              </ul>
            )}
          </div>
          <Column title="Overdue or due now" list={overdue} empty="Nothing overdue." />
          <Column title="Completed" list={done} empty="Nothing completed yet." />
          <Column title="Upcoming" list={upcoming} empty="Nothing upcoming." />
          <p className="text-xs text-earth">Every item traces to the guideline named under it.</p>
        </div>
      )}
    </Page>
  );
}
