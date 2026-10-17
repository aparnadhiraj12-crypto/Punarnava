import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getWoman, getInteractions } from "../../lib/api";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import DoctorUpdates from "../../components/DoctorUpdates";
import PatientCode from "../../components/PatientCode";
import { eventLabel } from "../../lib/labels";
import { Loading, Unreachable } from "../../components/Page";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const LANGUAGE_NAMES = {
  en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", kn: "Kannada", ml: "Malayalam",
  mr: "Marathi", bn: "Bengali", gu: "Gujarati", pa: "Punjabi", or: "Odia", as: "Assamese", ur: "Urdu",
};
const languageName = (code) => LANGUAGE_NAMES[String(code).toLowerCase()] ?? String(code).toUpperCase();

export default function MotherDetail() {
  const { id } = useParams();
  const [woman, setWoman] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([getWoman(id), getInteractions(id)])
      .then(([womanRes, interactionRes]) => {
        if (!active) return;

        setWoman(womanRes?.woman ?? womanRes);
        setInteractions(
          interactionRes?.interactions ??
          (Array.isArray(interactionRes) ? interactionRes : [])
        );
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (failed) {
    return (
      <AppShell role="asha">
        <Unreachable />
      </AppShell>
    );
  }

  if (!woman) {
    return (
      <AppShell role="asha">
        <Loading />
      </AppShell>
    );
  }

  return (
    <AppShell role="asha">
      <PageTitle
        eyebrow="ASHA · Mother record"
        title={woman.name}
        copy="What her doctor will see, plus the visits you have logged."
      />

      <section className="profile-card">
        <Avatar name={woman.name} />

        <div className="profile-card-main">
          <div className="card-title">{woman.name}</div>

          <div className="tag-row">
            {woman.age != null && <Badge>{woman.age} years</Badge>}
            {woman.language && <Badge>{languageName(woman.language)}</Badge>}
            {woman.postpartum_day != null && (
              <Badge tone="sage">
                Day {woman.postpartum_day} postpartum
              </Badge>
            )}
            {woman.trimester != null && (
              <Badge tone="sage">Trimester {woman.trimester}</Badge>
            )}
            {woman.incomplete && <Badge tone="mustard">Details incomplete</Badge>}
          </div>
        </div>
      </section>

      <PatientCode code={woman.mother_code} />

      <section className="detail-grid">
        <article className="form-card">
          <div className="eyebrow">Pregnancy & delivery</div>

          <dl className="detail-list">
            <div>
              <dt>Pregnancy started</dt>
              <dd>{formatDate(woman.pregnancy_start_date)}</dd>
            </div>

            <div>
              <dt>Delivery</dt>
              <dd>{formatDate(woman.delivery_date)}</dd>
            </div>

            <div>
              <dt>Mode</dt>
              <dd>{woman.mode_of_delivery || "—"}</dd>
            </div>

            <div>
              <dt>Estimated due date</dt>
              <dd>{formatDate(woman.estimated_due_date)}</dd>
            </div>

            <div>
              <dt>Discharge haemoglobin</dt>
              <dd>{woman.discharge_hb != null ? `${woman.discharge_hb} g/dL` : "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="form-card">
          <div className="eyebrow">Contact</div>

          <dl className="detail-list">
            <div>
              <dt>Village</dt>
              <dd>{woman.village || "—"}</dd>
            </div>

            <div>
              <dt>Phone</dt>
              <dd>{woman.phone || "—"}</dd>
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No recorded clinical events.</p>
          )}

          {woman.medications?.length > 0 && (
            <>
              <div className="eyebrow detail-subhead">Medications</div>
              <ul className="simple-list">
                {woman.medications.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </article>
      </section>

      <DoctorUpdates womanId={id} audience="asha" />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Visit history</div>
            <h2>Recent interactions</h2>
          </div>

          <Link to={`/a/mother/${id}/log`}>
            <Button>
              <Icon name="plus" />
              Log visit
            </Button>
          </Link>
        </div>

        {interactions.length === 0 ? (
          <div className="empty-inline">
            <p>No visits have been recorded yet.</p>
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
                    {item.outcome || item.reason || "Interaction recorded"}
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
        <Link to="/a">
          <Button tone="secondary">Back to queue</Button>
        </Link>

        <Link to={`/a/mother/${id}/log`}>
          <Button>
            Log a visit <Icon name="arrow" />
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}