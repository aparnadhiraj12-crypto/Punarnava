import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getWoman, getInteractions } from "../../lib/api";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { Loading, Unreachable } from "../../components/Page";

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([getWoman(uid), getInteractions(uid)])
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
          <div className="eyebrow">Mother ID</div>
          <div className="display display-sm">{woman.id}</div>
        </article>

        <article className="form-card">
          <div className="eyebrow">Delivery</div>

          <dl className="detail-list">
            <div>
              <dt>Date</dt>
              <dd>{formatDate(woman.delivery_date)}</dd>
            </div>

            <div>
              <dt>Mode</dt>
              <dd>{woman.mode_of_delivery || "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="form-card">
          <div className="eyebrow">Medical history</div>

          {woman.clinical_events?.length ? (
            <ul className="tag-row">
              {woman.clinical_events.map((event, index) => (
                <li key={`${event.type}-${index}`}>
                  <Badge>{event.type}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No clinical events recorded.</p>
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
