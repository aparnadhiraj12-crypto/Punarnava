// /m and /m/:id - one mother's journey, loaded from the URL (guide section 5).
// Restyled as the redesign's "Journey" screen: a hero for the next milestone,
// a progress bar, then the full timeline.
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getWoman, recordVisit } from "../../lib/api";
import { milestoneLabel, eventLabel, stateTone, stateClass, stateText } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import { nextMilestone, progress, isActionable } from "../../lib/milestones";
import AppShell from "../../components/AppShell";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import PageTitle from "../../components/PageTitle";
import PixelArt from "../../components/PixelArt";
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

  if (failed) return <AppShell role="mother"><Unreachable onRetry={load} /></AppShell>;
  if (!woman) return <AppShell role="mother"><Loading /></AppShell>;

  const milestones = woman.milestones ?? [];
  const next = nextMilestone(milestones);
  const { done, total } = progress(milestones);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow={`Hello, ${woman.name}`}
        title="Your journey"
        copy={`Day ${woman.postpartum_day} after delivery · ${formatDate(woman.delivery_date)}${woman.mode_of_delivery ? ` · ${woman.mode_of_delivery}` : ""}`}
      />

      {woman.incomplete && (
        <p className="form-error" style={{ marginBottom: "1.5rem" }}>Some details are missing, so this journey may be incomplete.</p>
      )}

      {woman.clinical_events?.length > 0 && (
        <ul className="tag-row">
          {woman.clinical_events.map((e, i) => (
            <li key={`${e.type}-${i}`}><Badge>{eventLabel(e.type)}</Badge></li>
          ))}
        </ul>
      )}

      <div className="link-row" style={{ marginTop: "1.2rem" }}>
        <Link to="/m/help"><Button>Not feeling well?</Button></Link>
        <Link to="/m/wellness"><Button tone="secondary">Wellness</Button></Link>
        <Link to="/m/journal"><Button tone="secondary">Journal</Button></Link>
        <Link to={`/c/handoff/${woman.id}`}><Button tone="quiet">Clinic summary</Button></Link>
      </div>

      {saveError && <p role="alert" className="form-error">Could not save. Try again.</p>}

      {next ? (
        <section className="next-card">
          <div className="next-content">
            <div className="eyebrow">Next milestone</div>
            <div className="display display-lg">{milestoneLabel(next.type)}</div>
            <Badge tone={stateTone(next.state)}>{stateText(next)}</Badge>
            <p>Due {formatDate(next.due_date)}.</p>
            {isActionable(next) && (
              <div className="button-row">
                <Button onClick={() => record(next, "done")}>I went <Icon name="check" /></Button>
                <Button tone="secondary" onClick={() => setAsking(next.rule_id)}>Could not go</Button>
              </div>
            )}
          </div>
          <PixelArt kind="mother" />
        </section>
      ) : total > 0 ? (
        <section className="next-card">
          <div className="next-content">
            <div className="eyebrow">Next milestone</div>
            <div className="display display-lg">You're up to date.</div>
            <p>No milestone needs action right now.</p>
          </div>
          <PixelArt kind="success" />
        </section>
      ) : null}

      {asking === next?.rule_id && (
        <div className="paper-card" style={{ marginTop: "1rem" }}>
          <p>Why could you not go?</p>
          <CouldNotGoReasons onSelect={(reason) => record(next, "could_not_go", reason)} />
          <Button tone="quiet" onClick={() => setAsking(null)}>Cancel</Button>
        </div>
      )}

      {total > 0 && (
        <div className="progress-block">
          <div>
            <strong>{done} of {total} milestones completed</strong>
            <span>Your record is up to date</span>
          </div>
          <div className="progress-track"><span style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      <section className="timeline">
        <div className="timeline-rule" />
        {milestones.map((m) => {
          const actionable = isActionable(m) && m.rule_id !== next?.rule_id;
          return (
            <article className={`timeline-item ${stateClass(m.state)}`} key={m.rule_id}>
              <span className="timeline-dot">{m.state === "done" ? <Icon name="check" size={15} /> : ""}</span>
              <div className="timeline-card">
                <div className="timeline-top">
                  <div>
                    <div className="card-title">{milestoneLabel(m.type)}</div>
                  </div>
                  <Badge tone={stateTone(m.state)}>{stateText(m)}</Badge>
                </div>
                <div className="date-line">
                  <Icon name="clock" />
                  <span>Due {formatDate(m.due_date)}</span>
                </div>
                {typeof m.entitlement === "string" && m.entitlement && (
                  <p className="entitlement">{m.entitlement}</p>
                )}
                <span className="citation">{m.citation}</span>

                {actionable && asking !== m.rule_id && (
                  <div className="card-actions">
                    <Button onClick={() => record(m, "done")}>I went</Button>
                    <Button tone="quiet" onClick={() => setAsking(m.rule_id)}>Could not go</Button>
                  </div>
                )}
                {asking === m.rule_id && m.rule_id !== next?.rule_id && (
                  <div className="card-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
                    <p style={{ margin: 0 }}>Why could you not go?</p>
                    <CouldNotGoReasons onSelect={(reason) => record(m, "could_not_go", reason)} />
                    <Button tone="quiet" onClick={() => setAsking(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
