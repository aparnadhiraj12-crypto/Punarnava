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

      <div className="partner-notice-banner" style={{
        background: "var(--paper-light)",
        border: "1px solid var(--line)",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        margin: "1.5rem 0",
        display: "flex",
        alignItems: "center",
        gap: "0.8rem",
        boxShadow: "0 2px 8px rgba(36, 51, 47, 0.05)"
      }}>
        <span style={{ fontSize: "1.4rem" }}>🔔</span>
        <div>
          <strong>Partner Notification & Guidance Access</strong>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
            You receive scheduled appointment reminders and mental support guidance for her current stage. Full medical records and private journals remain strictly private to {view.name}.
          </p>
        </div>
      </div>

      {view.mental_support && (
        <section className="summary-section partner-mental-card" style={{
          background: "var(--paper-light)",
          border: "1.5px solid var(--soft-green)",
          borderRadius: "18px",
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--green)" }}>Partner Support · {view.mental_support.title}</div>
              <h2 className="card-title" style={{ marginTop: "0.25rem", fontSize: "1.3rem" }}>{view.mental_support.theme}</h2>
            </div>
            <Badge tone="sage">Mental & Emotional Care</Badge>
          </div>

          <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", background: "rgba(168, 197, 181, 0.15)", borderRadius: "10px" }}>
            <strong style={{ fontSize: "0.9rem", color: "var(--green-dark)" }}>What she is experiencing right now:</strong>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.9rem", color: "var(--text)" }}>{view.mental_support.what_she_experiences}</p>
          </div>

          <div style={{ marginTop: "1.2rem" }}>
            <strong style={{ fontSize: "0.95rem" }}>How you can support her mentally during this stage:</strong>
            <ul style={{ listStyle: "none", padding: 0, marginTop: "0.6rem", display: "grid", gap: "0.6rem" }}>
              {view.mental_support.mental_support_actions.map((act, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--green)", fontWeight: "bold" }}>✓</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {view.mental_support.appointment_focus && (
            <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px dashed var(--line)", fontSize: "0.85rem", color: "var(--muted)" }}>
              <strong>Clinical focus for this stage:</strong> {view.mental_support.appointment_focus}
            </div>
          )}
        </section>
      )}

      {view.notifications?.length > 0 && (
        <section className="summary-section" style={{ marginBottom: "2rem" }}>
          <div className="eyebrow">Upcoming Appointment Alerts</div>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.8rem", marginTop: "0.5rem" }}>
            {view.notifications.map((n) => (
              <li key={n.id} style={{
                background: "var(--paper-light)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{n.title}</strong>
                  <Badge tone={n.status === "due" ? "terra" : "sage"}>
                    {n.status === "due" ? "Due Now" : `Due ${formatDate(n.due_date)}`}
                  </Badge>
                </div>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text)" }}>{n.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

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
