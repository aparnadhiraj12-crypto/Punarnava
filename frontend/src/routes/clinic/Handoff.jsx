// /c/handoff/:id and /s/:token - one-page summary for a receiving clinic.
// Works with no account - restyled as the redesign's stand-alone "Summary" sheet
// (no sidebar). Uses the real field names (state, postpartum_day, clinical_events).
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getWoman } from "../../lib/api";
import { milestoneLabel, eventLabel } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import Brand from "../../components/Brand";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { Loading, Unreachable } from "../../components/Page";

function Column({ title, list, empty }) {
  return (
    <section className="summary-section">
      <div className="eyebrow">{title}</div>
      {list.length === 0 ? <p>{empty}</p> : (
        <ul>
          {list.map((m) => (
            <li key={m.rule_id}>
              <div className="row-top">
                <strong>{milestoneLabel(m.type)}</strong>
                <span>Due {formatDate(m.due_date)}{m.state === "missed" && m.days_overdue ? ` · ${m.days_overdue}d overdue` : ""}</span>
              </div>
              <span className="citation">{m.citation}</span>
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
  const shared = Boolean(token);
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
    <main className={shared ? "shared-page" : "summary-page"}>
      <div className="summary-topbar">
        <Link to={id ? `/m/${id}` : "/"}><Button tone="quiet"><Icon name="arrow" /> Back</Button></Link>
        <Button tone="secondary" onClick={() => window.print()}>Print</Button>
      </div>

      {failed && <Unreachable onRetry={load} />}
      {!failed && !woman && <Loading />}
      {woman && (
        <div className="summary-sheet">
          <div className="summary-head">
            <Brand />
            <div>
              <div className="eyebrow">{shared ? "Secure shared summary" : "Care summary"}</div>
              <div className="display display-md">{woman.name}</div>
            </div>
            {shared && <Badge tone="sage"><Icon name="shield" size={14} /> Private link</Badge>}
          </div>

          <div className="summary-status">
            <div>
              <span>Current status</span>
              <strong>Day {woman.postpartum_day} after delivery · {formatDate(woman.delivery_date)}{woman.mode_of_delivery ? ` · ${woman.mode_of_delivery}` : ""}</strong>
            </div>
            {overdue.length > 0 && <Badge tone="terra">{overdue.length} milestone{overdue.length === 1 ? "" : "s"} due or overdue</Badge>}
          </div>

          {woman.discharge_hb != null && <p className="section-note">Haemoglobin at discharge: {woman.discharge_hb}</p>}
          {woman.clinical_events?.length > 0 && (
            <ul className="tag-row">
              {woman.clinical_events.map((e, i) => (
                <li key={`${e.type}-${i}`}><Badge>{eventLabel(e.type)}</Badge></li>
              ))}
            </ul>
          )}

          <div className="summary-columns three">
            <Column title="Overdue or due now" list={overdue} empty="Nothing overdue." />
            <Column title="Completed" list={done} empty="Nothing completed yet." />
            <Column title="Upcoming" list={upcoming} empty="Nothing upcoming." />
          </div>

          <footer className="summary-footer">
            <span><Icon name="shield" /> Every item traces to the guideline named under it.</span>
            <span>Generated {new Date().toLocaleString("en-IN")}</span>
          </footer>
        </div>
      )}
    </main>
  );
}
