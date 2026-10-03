// /a - ASHA queue. The ONLY order is the backend's (most days overdue first).
// No sort dropdown, no severity labels; clinical events are plain tags.
// Two-tap rule (FR-E3): tap 1 picks the outcome, tap 2 confirms or picks a reason.
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listWomen, recordVisit } from "../../lib/api";
import { eventLabel } from "../../lib/labels";
import { todayLong } from "../../lib/dates";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import CouldNotGoReasons from "../../components/CouldNotGoReasons";
import PatientCode from "../../components/PatientCode";
import { Loading, Unreachable, EmptyState } from "../../components/Page";

function StatusBadge({ online }) {
  return <Badge tone={online ? "sage" : "ink"}><span className="online-dot" /> {online ? "Online" : "Offline"}</Badge>;
}

export default function Queue() {
  const [women, setWomen] = useState(null);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
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
    <AppShell role="asha">
      <PageTitle eyebrow="ASHA workspace" title="Today's visits" copy="Sorted by days overdue — no risk scoring." action={<StatusBadge online={online} />} />

      <div className="queue-toolbar">
        <div>
          <strong>{women ? `${women.length} mother${women.length === 1 ? "" : "s"} to follow up` : "Loading…"}</strong>
          <span>{todayLong()}</span>
        </div>
        <Link to="/a/enrol"><Button><Icon name="plus" /> Enrol a mother</Button></Link>
      </div>

      {failed && <Unreachable onRetry={load} />}
      {!failed && !women && <Loading />}
      {saveError && <p role="alert" className="form-error">Could not save. Try again.</p>}
      {women?.length === 0 && <EmptyState title="No mothers yet." note="Enrol one to get started." />}

      <section className="queue-list">
        {women?.map((m, index) => {
          const isPending = pending?.id === m.id;
          const overdue = m.max_days_overdue > 0;
          return (
            <article className={`queue-card ${overdue ? "overdue" : ""}`} key={m.id}>
              <div className="queue-number">{String(index + 1).padStart(2, "0")}</div>
              <Avatar name={m.name} />
              <div className="queue-person">
                <div className="eyebrow">Day {m.postpartum_day} after delivery</div>
                <div className="card-title">{m.name}</div>
                {m.clinical_events?.length > 0 && (
                  <ul className="tag-row">
                    {m.clinical_events.map((e, i) => (
                      <li key={`${e.type}-${i}`}><Badge>{eventLabel(e.type)}</Badge></li>
                    ))}
                  </ul>
                )}
                <PatientCode code={m.mother_code} compact />
              </div>
              <Badge tone={overdue ? "terra" : "sage"}>{overdue ? `${m.max_days_overdue} days overdue` : "Up to date"}</Badge>

              {!isPending && (
                <div className="queue-actions">
                  <div className="row">
                    <Button onClick={() => recordTwoTap(m, "done")}>Done</Button>
                    <Button tone="secondary" onClick={() => recordTwoTap(m, "could_not_go")}>Could not go</Button>
                    <Link to={`/m/${m.id}`}><Button tone="quiet">View timeline</Button></Link>
                  </div>
                </div>
              )}

              {isPending && pending.outcome === "done" && (
                <div className="queue-actions">
                  <p className="prompt-line">Mark the most overdue visit as done?</p>
                  <div className="row">
                    <Button onClick={() => confirm(m, "done")}>Yes, done <Icon name="check" /></Button>
                    <Button tone="quiet" onClick={() => setPending(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {isPending && pending.outcome === "could_not_go" && (
                <div className="queue-actions">
                  <p className="prompt-line">Why could she not go?</p>
                  <CouldNotGoReasons onSelect={(reason) => confirm(m, "could_not_go", reason)} />
                  <Button tone="quiet" onClick={() => setPending(null)}>Cancel</Button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="queue-rule">
        <Icon name="clock" />
        <span>This queue is ordered only by the number of days a visit is overdue.</span>
      </div>
    </AppShell>
  );
}
