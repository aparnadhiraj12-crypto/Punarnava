import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getWoman, getInteractions, getMedications, getMotherReport } from "../../lib/api";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { Loading, Unreachable } from "../../components/Page";
import { eventLabel, milestoneLabel, stateText, stateTone } from "../../lib/labels";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MotherRecord() {
  const { uid } = useParams();

  const [woman, setWoman] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [medications, setMedications] = useState([]);
  const [medicationsUnavailable, setMedicationsUnavailable] = useState(false);
  const [report, setReport] = useState(null);
  const [reportUnavailable, setReportUnavailable] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      getWoman(uid),
      getInteractions(uid),
      getMedications(uid).catch(() => null),
      getMotherReport(uid).catch(() => null),
    ])
      .then(([womanRes, interactionRes, medicationRes, reportRes]) => {
        if (!active) return;

        setWoman(womanRes?.woman ?? womanRes);

        setInteractions(
          interactionRes?.interactions ??
          (Array.isArray(interactionRes) ? interactionRes : [])
        );

        if (medicationRes) {
          setMedications(
            medicationRes?.medications ??
            medicationRes?.entries ??
            (Array.isArray(medicationRes) ? medicationRes : [])
          );
        } else {
          setMedicationsUnavailable(true);
        }

        if (reportRes) {
          setReport(reportRes?.report ?? reportRes);
        } else {
          setReportUnavailable(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [uid]);

  if (failed) {
    return (
      <AppShell role="doctor">
        <Unreachable />
      </AppShell>
    );
  }

  if (!woman) {
    return (
      <AppShell role="doctor">
        <Loading />
      </AppShell>
    );
  }

  return (
    <AppShell role="doctor">
      <PageTitle
        eyebrow="Doctor · Mother record"
        title={woman.name}
        copy="Chronological continuity record."
        action={
          <Link to="/d">
            <Button tone="secondary">Back to search</Button>
          </Link>
        }
      />

      <section className="profile-card">
        <Avatar name={woman.name} />

        <div className="profile-card-main">
          <div className="card-title">{woman.name}</div>

          <div className="tag-row">
            {woman.age != null && <Badge>{woman.age} years</Badge>}

            {woman.postpartum_day != null && (
              <Badge tone="sage">
                Day {woman.postpartum_day} postpartum
              </Badge>
            )}

            {woman.language && (
              <Badge>{woman.language.toUpperCase()}</Badge>
            )}
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <article className="form-card">
          <div className="eyebrow">Unique Mother ID</div>
          <div className="display display-sm">{woman.mother_code || "—"}</div>
          {woman.id && <p className="muted">Record reference: {woman.id}</p>}
        </article>

        <article className="form-card">
          <div className="eyebrow">Pregnancy & delivery</div>

          <dl className="detail-list">
            <div>
              <dt>Pregnancy started</dt>
              <dd>{formatDate(woman.pregnancy_start_date)}</dd>
            </div>
            <div>
              <dt>Estimated due date</dt>
              <dd>{formatDate(woman.estimated_due_date)}</dd>
            </div>
            {woman.trimester != null && (
              <div>
                <dt>Trimester</dt>
                <dd>{woman.trimester}</dd>
              </div>
            )}
            <div>
              <dt>Delivery date</dt>
              <dd>{formatDate(woman.delivery_date)}</dd>
            </div>
            <div>
              <dt>Mode of delivery</dt>
              <dd>{woman.mode_of_delivery || "—"}</dd>
            </div>
            {woman.postpartum_day != null && (
              <div>
                <dt>Postpartum day</dt>
                <dd>{woman.postpartum_day}</dd>
              </div>
            )}
            <div>
              <dt>Haemoglobin at discharge</dt>
              <dd>{woman.discharge_hb ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="form-card">
          <div className="eyebrow">Personal & contact details</div>
          <dl className="detail-list">
            <div>
              <dt>Age</dt>
              <dd>{woman.age != null ? `${woman.age} years` : "—"}</dd>
            </div>
            <div>
              <dt>Preferred language</dt>
              <dd>{woman.language || "—"}</dd>
            </div>
            <div>
              <dt>Village</dt>
              <dd>{woman.village || "—"}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{woman.phone || "—"}</dd>
            </div>
            <div>
              <dt>Assigned ASHA ID</dt>
              <dd>{woman.assigned_asha || "—"}</dd>
            </div>
            <div>
              <dt>Consent recorded</dt>
              <dd>
                {woman.consent == null ? "Not recorded" : woman.consent ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt>Record completeness</dt>
              <dd>{woman.incomplete ? "Some details are incomplete" : "No missing details flagged"}</dd>
            </div>
          </dl>
        </article>

        <article className="form-card">
          <div className="eyebrow">Clinical history</div>
          {woman.clinical_events?.length ? (
            <ul className="tag-row">
              {woman.clinical_events.map((event, index) => (
                <li key={`${event.type}-${index}`}>
                  <Badge>{eventLabel(event.type)}</Badge>
                  {event.source && <span className="muted">{event.source}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No clinical events recorded.</p>
          )}

          <div className="eyebrow detail-subhead">Food preferences</div>
          {woman.food_preferences?.length ? (
            <ul className="simple-list">
              {woman.food_preferences.map((preference, index) => (
                <li key={`${preference}-${index}`}>{preference}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No food preferences recorded.</p>
          )}

          {woman.medications?.length > 0 && (
            <>
              <div className="eyebrow detail-subhead">Mother-reported medications</div>
              <ul className="simple-list">
                {woman.medications.map((medication, index) => (
                  <li key={`${medication}-${index}`}>{medication}</li>
                ))}
              </ul>
            </>
          )}

          <div className="eyebrow detail-subhead">Medications</div>

          {medicationsUnavailable ? (
            <p className="muted">
              Medication history is not available right now.
            </p>
          ) : medications.length > 0 ? (
            <ul className="simple-list">
              {medications.map((item, index) => {
                const name =
                  typeof item === "string"
                    ? item
                    : item.name || item.medication_name || item.medication || item.medicine || "Medication";

                const details = [
                  item.dosage,
                  item.frequency,
                  item.duration,
                  item.instructions,
                  item.prescribed_by && `Prescribed by ${item.prescribed_by}`,
                  item.timestamp && formatDate(item.timestamp),
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={item.id ?? `${name}-${index}`}>
                    <div>{name}</div>
                    {details && <div className="muted">{details}</div>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">No medications recorded.</p>
          )}
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Care schedule</div>
            <h2>Milestones</h2>
          </div>
        </div>
        {woman.milestones?.length ? (
          <ul className="record-milestones">
            {woman.milestones.map((milestone) => (
              <li key={milestone.rule_id}>
                <div>
                  <strong>{milestoneLabel(milestone.type)}</strong>
                  <span>Due {formatDate(milestone.due_date)}</span>
                </div>
                <Badge tone={stateTone(milestone.state)}>{stateText(milestone)}</Badge>
                {milestone.citation && <small>{milestone.citation}</small>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-inline">
            <p>No care milestones are available for this record.</p>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Doctor report</div>
            <h2>Record summary</h2>
          </div>

          <Button tone="secondary" onClick={() => window.print()}>
            Print / export
          </Button>
        </div>

        {reportUnavailable ? (
          <div className="empty-inline">
            <p>Report data is not available right now.</p>
            <p className="muted">
              You can still print the information currently visible on this record.
            </p>
          </div>
        ) : report ? (
          <>
            <div className="detail-grid">
              {Object.entries(report)
                .filter(([key, value]) => {
                  if ([
                    "id", "woman_id", "mother_id", "name", "clinical_events",
                    "discharge_hb", "mode_of_delivery", "postpartum_day",
                    "milestones", "milestone_counts", "self_reported",
                    "prescribed_medication", "journal_activity",
                  ].includes(key)) return false;
                  return (
                    typeof value === "string" ||
                    typeof value === "number" ||
                    typeof value === "boolean"
                  );
                })
                .map(([key, value]) => (
                  <article className="form-card" key={key}>
                    <div className="eyebrow">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="display display-sm">
                      {String(value)}
                    </div>
                  </article>
                ))}
            </div>

            <div className="section-block">
              <h3>What she reported</h3>
              {report.self_reported?.length ? (
                <ul className="simple-list">
                  {report.self_reported.map((entry, index) => (
                    <li key={entry.id ?? index}>
                      <strong>{entry.type?.replace(/_/g, " ") || "Entry"}</strong>
                      <span>{entry.text}</span>
                      {(entry.visit_date || entry.provider_name || entry.medication_name) && (
                        <small>
                          {[entry.visit_date && formatDate(entry.visit_date),
                            entry.provider_name,
                            entry.medication_name]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No self-reported entries are available.</p>
              )}
            </div>

            {report.journal_activity && (
              <p className="muted">
                Journal activity: {report.journal_activity.entry_count} entr{report.journal_activity.entry_count === 1 ? "y" : "ies"} recorded.
              </p>
            )}
          </>
        ) : (
          <div className="empty-inline">
            <p>No report summary is available.</p>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Continuity history</div>
            <h2>Chronological record</h2>
          </div>
        </div>

        {interactions.length === 0 ? (
          <div className="empty-inline">
            <p>No visit interactions have been recorded.</p>
          </div>
        ) : (
          <div className="timeline-list">
            {interactions.map((item, index) => (
              <article className="timeline-item" key={item.id ?? index}>
                <div className="timeline-dot" />

                <div>
                  <div className="eyebrow">
                    {formatDate(item.created_at || item.date)}
                  </div>

                  <div className="card-title">
                    {item.outcome || "Interaction recorded"}
                  </div>

                  {item.reason && (
                    <p className="muted">{item.reason}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="button-row">
        <Link to="/d">
          <Button tone="secondary">
            <Icon name="arrow" />
            Search another mother
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}
