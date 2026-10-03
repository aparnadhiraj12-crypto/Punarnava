import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getFamilySharedView } from "../../lib/api";
import { milestoneLabel } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import Brand from "../../components/Brand";
import Badge from "../../components/Badge";
import { Loading, Unreachable, EmptyState } from "../../components/Page";

export default function FamilyView() {
  const { grantId } = useParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revoked, setRevoked] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    setRevoked(false);
    getFamilySharedView(grantId)
      .then(setView)
      .catch((err) => {
        if (err?.status === 403) setRevoked(true);
        else setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [grantId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  if (revoked) {
    return (
      <main className="summary-page">
        <Brand />
        <div className="mini-state" style={{ marginTop: 24 }}>
          <strong>This link is no longer active.</strong>
          <small>The mother may have revoked sharing. Ask her for a new link if you still need access.</small>
        </div>
      </main>
    );
  }

  if (failed) return <Unreachable onRetry={load} />;
  if (!view) return null;

  const hasDiet = (view.diet?.length ?? 0) > 0;
  const hasExercise = (view.exercise?.length ?? 0) > 0;
  const hasClasses = (view.classes?.length ?? 0) > 0;
  const hasVisits = (view.self_reported?.length ?? 0) > 0;
  const hasMeds = (view.prescribed_medication?.length ?? 0) > 0;

  return (
    <main className="summary-page">
      <Brand />
      <div className="eyebrow">Shared by {view.name}</div>
      <h1 className="display display-lg">A look at how she's doing.</h1>
      <p className="muted">
        This is a limited view your family member chose to share with you. It does
        not include her private journal or anything she has not chosen to share.
      </p>

      {view.stage && (
        <section className="summary-section">
          <div className="eyebrow">Current stage</div>
          <Badge>{view.stage.replace(/_/g, " ")}</Badge>
          {view.postpartum_day != null && view.postpartum_day >= 0 && (
            <p className="muted">Day {view.postpartum_day} postpartum</p>
          )}
        </section>
      )}

      {hasVisits && (
        <section className="summary-section">
          <div className="eyebrow">Doctor visits</div>
          <ul>
            {view.self_reported.map((e) => (
              <li key={e.id}>
                <strong>{e.visit_date ? formatDate(e.visit_date) : "Visit"}</strong>
                {e.provider_name ? ` with ${e.provider_name}` : ""}
                {e.text ? ` - ${e.text}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasMeds && (
        <section className="summary-section">
          <div className="eyebrow">Medication</div>
          <ul>
            {view.prescribed_medication.map((m) => (
              <li key={m.id}>
                <strong>{m.medication_name}</strong>
                {m.dosage ? ` - ${m.dosage}` : ""}
                {m.instructions ? ` - ${m.instructions}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasDiet && (
        <section className="summary-section">
          <div className="eyebrow">Diet for this stage</div>
          <ul>
            {view.diet.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(hasExercise || hasClasses) && (
        <section className="summary-section">
          <div className="eyebrow">Movement and classes</div>
          {hasExercise && (
            <ul>
              {view.exercise.map((c) => (
                <li key={c.id}><strong>{c.title}</strong><p>{c.body}</p></li>
              ))}
            </ul>
          )}
          {hasClasses && (
            <ul>
              {view.classes.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong> - {p.type}, {p.region}
                  {p.contact ? ` - ${p.contact}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!hasVisits && !hasMeds && !hasDiet && !hasExercise && !hasClasses && (
        <EmptyState title="Nothing shared yet." note="Check back after her next update." />
      )}

      {view.milestones?.length > 0 && (
        <section className="summary-section">
          <div className="eyebrow">Upcoming and recent</div>
          <ul>
            {view.milestones.slice(0, 6).map((m) => (
              <li key={m.rule_id}>
                {milestoneLabel(m.type)} - due {formatDate(m.due_date)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
